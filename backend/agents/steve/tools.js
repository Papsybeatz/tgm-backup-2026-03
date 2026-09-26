/**
 * Steve — toolbelt
 * ----------------------------------------------------------------------------
 * The five tools that make Steve a worker instead of a chatbot:
 *   capture_intake, create_draft, write_section, score_draft, apply_fixes,
 *   notify_review_ready  (+ get_draft_status for grounding)
 *
 * Tools mutate the turn-scoped `state` object. The agent persists `state`
 * afterwards, so the tool loop and the order ticket never disagree.
 */
const {
  SLOTS,
  mergeOrder,
  missingRequired,
  isComplete,
  nextQuestion,
  orderProgress,
  summarizeOrder,
  validateOrder,
  deriveTitle,
} = require('./order');
const { generateGrant, reviseSection } = require('./drafting');
const { scoreDraft } = require('./scoring');
const { saveDraftForUser, notifyReadyForReview } = require('./persist');

/* ───────────────────────────── JSON schemas ───────────────────────────── */

/**
 * A compact description of the order fields.
 *
 * The previous version declared all 18 fields as full JSON-Schema properties
 * with hints. That is ~800 tokens sent on EVERY request, which on Groq's 8k
 * tokens-per-minute tier is a meaningful slice of the entire budget for one
 * line of schema the model rarely needs in detail.
 */
const ORDER_FIELD_KEYS = Object.keys(SLOTS);
const ORDER_FIELDS_SCHEMA = {
  type: 'object',
  description: `Order fields, keyed by name. Valid keys: ${ORDER_FIELD_KEYS.map(
    (key) => `${key} (${SLOTS[key].label})`,
  ).join(', ')}. Omit anything the applicant did not state.`,
  additionalProperties: { type: 'string' },
};

const TOOL_SCHEMAS = [
  {
    type: 'function',
    function: {
      name: 'capture_intake',
      description:
        'Record order-ticket details the applicant just provided. Pass ONLY fields they actually stated. Omit anything unknown. Never invent values.',
      parameters: {
        type: 'object',
        properties: { fields: ORDER_FIELDS_SCHEMA },
        required: ['fields'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_draft',
      description:
        'Write the full grant document from the completed order ticket. Only call when the ticket is complete. Saves to the workspace and runs Checkmate scoring.',
      parameters: {
        type: 'object',
        properties: {
          style: { type: 'string', enum: ['full_proposal', 'letter'], description: 'Deliverable style.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_section',
      description: 'Write or rewrite a single section of the current draft.',
      parameters: {
        type: 'object',
        properties: {
          section: { type: 'string', description: 'Exact section name, e.g. "Statement of Need".' },
          instruction: { type: 'string', description: 'What the applicant wants changed, in their words.' },
        },
        required: ['section'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'score_draft',
      description: 'Run Checkmate scoring on the current draft: rubric, strengths, gaps, fixes.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'apply_fixes',
      description: "Apply Checkmate's recommended fixes to the draft.",
      parameters: {
        type: 'object',
        properties: {
          fixes: { type: 'array', items: { type: 'string' }, description: 'Fixes to apply. Defaults to Checkmate recommendations.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'notify_review_ready',
      description: 'Tell the applicant their grant is ready for review (in-app handoff + email).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_draft_status',
      description: 'Read the current order ticket and draft state: filled lines, missing lines, score, draft id.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

/* ────────────────────────────── helpers ────────────────────────────── */

function decodeEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function encodeEntities(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Split a rendered document back into { sectionName: html } for editing. */
function parseSections(html) {
  const text = String(html || '');
  const sections = {};
  const regex = /<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2[^>]*>|$)/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const name = decodeEntities(match[1].replace(/<[^>]+>/g, '').trim());
    if (name) sections[name] = match[2].trim();
  }
  return sections;
}

function renderDocument(title, sections) {
  const body = Object.keys(sections)
    .map((name) => `<h2>${encodeEntities(name)}</h2>\n${sections[name]}`)
    .join('\n\n');
  return `<h1>${encodeEntities(title || 'Grant Proposal')}</h1>\n${body}`;
}

/** Find the best matching section for a fix instruction. */
function pickSectionForFix(sections, instruction) {
  const names = Object.keys(sections);
  const text = String(instruction || '').toLowerCase();
  const hints = [
    [/budget|cost|allocat|expense/, 'Budget Narrative'],
    [/outcome|measur|quantif|kpi/, 'Outcomes & Evaluation'],
    [/need|problem|statistic|local data/, 'Statement of Need'],
    [/evidence|proof|track record|partner|testimonial/, 'Organization Background'],
    [/align|funder|priorit|mission/, 'Executive Summary'],
    [/timeline|schedule|date|month/, 'Timeline'],
  ];
  for (const [pattern, wanted] of hints) {
    if (pattern.test(text)) {
      const found = names.find((name) => name.toLowerCase() === wanted.toLowerCase());
      if (found) return found;
    }
  }
  return names.find((name) => /statement of need/i.test(name)) || names[0];
}

/* ───────────────────────────── the toolkit ───────────────────────────── */

function createToolkit(ctx) {
  const { state, user } = ctx;
  const tier = ctx.tier || user?.tier || 'free';

  const base = (extra = {}) => ({
    ok: true,
    status: state.status,
    orderComplete: isComplete(state.order),
    missing: missingRequired(state.order),
    progress: orderProgress(state.order),
    draftId: state.draftId,
    score: state.score,
    ...extra,
  });

  const requireDraft = () => {
    if (!state.docHtml) return base({ ok: false, reason: 'no_draft_yet' });
    return null;
  };

  const executors = {
    async capture_intake(args = {}) {
      const patch = args.fields && typeof args.fields === 'object' ? args.fields : args;
      state.order = mergeOrder(state.order, patch);
      const missing = missingRequired(state.order);
      return base({
        missingLabels: missing.map((key) => SLOTS[key].label),
        nextQuestion: missing.length ? nextQuestion(state.order)?.question || null : null,
      });
    },

    async get_draft_status() {
      return base({
        orderSummary: summarizeOrder(state.order),
        nextQuestion: nextQuestion(state.order)?.question || null,
        sections: state.docHtml ? Object.keys(parseSections(state.docHtml)) : [],
      });
    },

    async create_draft(args = {}) {
      if (!isComplete(state.order)) {
        return base({
          ok: false,
          reason: 'order_incomplete',
          missingLabels: missingRequired(state.order).map((key) => SLOTS[key].label),
          nextQuestion: nextQuestion(state.order)?.question || null,
        });
      }

      const blockers = validateOrder(state.order);
      if (blockers.length) return base({ ok: false, reason: 'order_invalid', blockers });

      // The TICKET is authoritative. state.style is a cache of the session value,
      // so preferring it would make an amended deliverable silently ignored.
      const style = args.style || state.order.style || state.style || 'letter';
      state.status = 'drafting';
      state.style = style;

      const draft = await generateGrant(state.order, { style });
      state.docTitle = draft.title;
      state.docHtml = draft.html;
      state.usedLLM = draft.usedLLM;

      const report = await scoreDraft(state.order, draft.html);
      state.score = report.score;
      state.scoreReport = report;

      let saved = { ok: false, reason: 'not_authenticated' };
      if (user?.id) {
        saved = await saveDraftForUser({
          userId: user.id,
          draftId: state.draftId,
          title: draft.title,
          content: draft.html,
          tier,
        });
        if (saved.ok && saved.draft) state.draftId = saved.draft.id;
      }

      state.status = 'ready_for_review';

      let notification = { inApp: true, emailed: false };
      if (user?.email) {
        notification = await notifyReadyForReview({
          user,
          draft: saved.draft || { title: draft.title },
          score: report.score,
        });
      }

      return base({
        title: draft.title,
        style,
        usedLLM: draft.usedLLM,
        saved: saved.ok,
        savedDraftId: saved.draft?.id || null,
        needsSignIn: !user?.id,
        scoreReport: report,
        notification,
        sections: Object.keys(parseSections(draft.html)),
      });
    },

    async score_draft() {
      const missing = requireDraft();
      if (missing) return missing;
      const report = await scoreDraft(state.order, state.docHtml);
      state.score = report.score;
      state.scoreReport = report;
      return base({ scoreReport: report });
    },

    async write_section(args = {}) {
      const missing = requireDraft();
      if (missing) return missing;

      const requested = String(args.section || '').trim();
      if (!requested) return base({ ok: false, reason: 'section_required' });

      const sections = parseSections(state.docHtml);
      const names = Object.keys(sections);
      const match =
        names.find((name) => name.toLowerCase() === requested.toLowerCase()) ||
        names.find((name) => name.toLowerCase().includes(requested.toLowerCase())) ||
        names.find((name) => requested.toLowerCase().includes(name.toLowerCase()));

      if (!match) return base({ ok: false, reason: 'unknown_section', availableSections: names });

      const instruction = String(args.instruction || '').trim() || `Rewrite ${match} to be stronger and more funder-aligned.`;
      const revised = await reviseSection(state.order, match, sections[match], instruction);

      const nextSections = { ...sections, [match]: revised.html };
      state.docHtml = renderDocument(state.docTitle, nextSections);
      state.status = 'ready_for_review';

      const report = await scoreDraft(state.order, state.docHtml);
      state.score = report.score;
      state.scoreReport = report;

      await persistIfPossible();

      return base({ section: match, usedLLM: revised.usedLLM, saved: Boolean(state.draftId), scoreReport: report });
    },

    async apply_fixes(args = {}) {
      const missing = requireDraft();
      if (missing) return missing;

      const fixes = Array.isArray(args.fixes) && args.fixes.length
        ? args.fixes
        : state.scoreReport?.fixes || state.scoreReport?.missingComponents || [];
      if (!fixes.length) return base({ ok: false, reason: 'no_fixes' });

      const sections = parseSections(state.docHtml);
      const target = pickSectionForFix(sections, fixes.join(' '));
      const revised = await reviseSection(
        state.order,
        target,
        sections[target] || '',
        `Address these reviewer fixes without inventing facts: ${fixes.join('; ')}`,
      );

      const nextSections = { ...sections, [target]: revised.html };
      state.docHtml = renderDocument(state.docTitle, nextSections);

      const report = await scoreDraft(state.order, state.docHtml);
      state.score = report.score;
      state.scoreReport = report;

      await persistIfPossible();

      return base({ appliedTo: target, appliedCount: fixes.length, scoreReport: report });
    },

    async notify_review_ready() {
      if (!state.docHtml) return base({ ok: false, reason: 'no_draft_yet' });
      const notification = await notifyReadyForReview({
        user,
        draft: { id: state.draftId, title: state.docTitle },
        score: state.score,
      });
      state.status = 'ready_for_review';
      return base({ notification });
    },
  };

  async function persistIfPossible() {
    if (!user?.id || !state.docHtml) return;
    const saved = await saveDraftForUser({
      userId: user.id,
      draftId: state.draftId,
      title: state.docTitle,
      content: state.docHtml,
      tier,
    });
    if (saved.ok && saved.draft) state.draftId = saved.draft.id;
  }

  async function execute(name, args) {
    const executor = executors[name];
    if (!executor) return { ok: false, reason: 'unknown_tool', tool: name };
    try {
      return await executor(args || {});
    } catch (error) {
      console.error(`[STEVE] tool ${name} failed:`, error?.message || error);
      return { ok: false, reason: 'tool_error', tool: name, error: error?.message || String(error) };
    }
  }

  return { schemas: TOOL_SCHEMAS, execute, executors, parseSections, renderDocument };
}

module.exports = {
  TOOL_SCHEMAS,
  createToolkit,
  parseSections,
  renderDocument,
  pickSectionForFix,
  deriveTitle,
  decodeEntities,
  encodeEntities,
};
