/**
 * Steve — the agent
 * ----------------------------------------------------------------------------
 * One entry point: `runSteveTurn()`.
 *
 * Steve runs a real tool-calling loop against the LLM. The order ticket is the
 * source of truth for what is still missing, so the conversation is guaranteed
 * to converge on a finished grant instead of drifting:
 *
 *   1. Fast paths handle obvious commands without an LLM (confirm, download, reset).
 *   2. The LLM tool loop does the real work (capture_intake, create_draft, ...).
 *   3. A deterministic guardrail appends the next question if the model forgot
 *      to ask it, and never lets a draft ship while the ticket is incomplete.
 *   4. With no LLM key, a plain line-by-line planner keeps the concierge usable.
 */
const llm = require('./llm');
const store = require('./store');
const { createToolkit, parseSections } = require('./tools');
const { notifyReadyForReview } = require('./persist');
const {
  SLOTS,
  mergeOrder,
  missingRequired,
  isComplete,
  nextQuestion,
  orderProgress,
  summarizeOrder,
  deriveTitle,
  isBlank,
  formatAmount,
  validateOrder,
} = require('./order');
const { parseAmendment, looksLikeProse, SHORT_SLOTS } = require('./amend');

const MAX_STEPS = 5;
const UPGRADE_LINK = `${process.env.APP_URL || 'https://www.thegrantsmaster.com'}/pricing`;

/** Quick-reply chips, so the applicant never has to guess what to type. */
const SUGGESTIONS = {
  applicant_name: ['It’s a nonprofit', 'A church', 'A school', 'A community group'],
  applicant_type: ['501(c)(3) nonprofit', 'Church', 'School', 'Community group', 'Fiscal sponsor'],
  need_statement: ['Skip the detail, just start', 'Here’s the story…'],
  target_population: ['Children and youth', 'Families', 'Seniors', 'People experiencing homelessness'],
  service_area: ['New York, NY', 'Roanoke, VA', 'Statewide', 'Nationwide'],
  request_amount: ['$10,000', '$50,000', '$75,000', '$250,000'],
  outcomes: ['Serve more people', 'Improve completion rates', 'Expand capacity'],
  funder_name: ['General request', 'A foundation', 'A government funder'],
  budget_breakdown: ['Skip — build one for me', 'Let me paste my budget'],
  timeline: ['12 months', '6 months', 'Next fiscal year'],
  funder_guidelines: ['Skip', 'Let me paste them'],
  evidence: ['Skip', 'We have results to share'],
  contact_name: ['Use my account details', 'Let me provide it'],
  deadline: ['None', 'Next 30 days', 'Next 90 days'],
  style: ['Full proposal', 'One-page letter'],
  people_served: ['30', '100', '500'],
};

const YES_PATTERN = /^(y|ye|yes+|yeah|yep|yup|ok|okay|sure|go|go ahead|do it|please do|write it|write it now|draft it|generate it|let'?s go|proceed|confirm|sounds good|perfect)\b/i;

/* ─────────────────────────── intent detection ─────────────────────────── */

function detectIntent(message, state) {
  const text = String(message || '').toLowerCase().trim();

  if (/^(reset|start over|restart|new grant|new order|clear)/.test(text)) return 'reset';
  // Correcting an existing ticket outranks everything except an explicit reset.
  if (parseAmendment(message, state.order)) return 'amend';
  if (/download|export|\bpdf\b|\bdocx?\b|word file|save the file/.test(text)) return 'download';
  if (/score|checkmate|review my draft|how good|grade/.test(text)) return 'score';
  if (/open (it|the draft|the editor)|edit in workspace|take me to the draft/.test(text)) return 'open_editor';
  if (/make it (stronger|better)|improve|fix (it|the draft)|apply the fix/.test(text)) return 'improve';
  if (state.docHtml && /rewrite|change|edit|update|shorten|expand/.test(text)) return 'edit';
  if (YES_PATTERN.test(text) && isComplete(state.order) && !state.docHtml) return 'confirm_draft';
  if (YES_PATTERN.test(text) && state.docHtml) return 'general';
  if (/^(hi|hello|hey|good (morning|afternoon|evening)|yo)\b/.test(text) && !isComplete(state.order)) return 'greeting';
  return 'general';
}

/* ──────────────────────────── system prompt ──────────────────────────── */

function buildSystemPrompt(state) {
  const missing = missingRequired(state.order);
  const next = nextQuestion(state.order, state.docHtml ? 0 : 3);
  const progress = orderProgress(state.order);

  const filledLines = Object.keys(SLOTS)
    .filter((key) => !isBlank(state.order[key]))
    .map((key) => `- ${SLOTS[key].label}: ${state.order[key]}`);

  const rules = [
    'You are Steve, the grant concierge for The Grants Master. You take a grant order the way a friendly counter attendant takes a food order: warm, plain-spoken, and efficient.',
    'You are filling an ORDER TICKET. You never invent facts about the applicant — only record what they actually tell you.',
    'Call capture_intake the moment the applicant gives new order details. Do it silently; do not announce it.',
    'Ask exactly ONE question per message. Never stack questions.',
    'Keep replies short — two or three sentences — except when reading the order back or handing over a finished draft.',
    'Never claim something was saved, scored, or written unless a tool returned success.',
    'Avoid jargon. A busy nonprofit director should feel like they are ordering lunch, not filling a government form.',
  ];

  if (!isComplete(state.order)) {
    rules.push(
      `The ticket is NOT complete. Ask for this next line and nothing else: "${next?.label}". Phrase it naturally in your own words.`,
    );
  } else if (!state.docHtml) {
    rules.push(
      'The ticket is complete. Read the order back briefly and ask if they want you to write it now. Do not call create_draft until they confirm.',
    );
  } else {
    rules.push(
      `A draft already exists ("${state.docTitle}") with a Checkmate score of ${state.score ?? 'n/a'}/100. Help them review, improve, or download it. Use write_section and apply_fixes when they ask for changes.`,
    );
  }

  return [
    rules.join(' '),
    '',
    `ORDER TICKET (${progress.requiredFilled}/${progress.requiredTotal} required lines filled):`,
    filledLines.length ? filledLines.join('\n') : '- (empty — this is a brand new order)',
    '',
    missing.length ? `STILL NEEDED: ${missing.map((key) => SLOTS[key].label).join(', ')}` : 'STILL NEEDED: nothing — the ticket is complete.',
    `NEXT QUESTION TO ASK: ${next?.question || '(none — ticket complete)'}`,
  ].join('\n');
}

/* ────────────────────────────── the tool loop ────────────────────────────── */

async function runToolLoop({ state, user, tier, message, history }) {
  const toolkit = createToolkit({ state, user, tier });

  const messages = [
    { role: 'system', content: buildSystemPrompt(state) },
    ...history
      .filter((item) => item.role === 'user' || item.role === 'assistant')
      .map((item) => ({ role: item.role, content: item.content })),
    { role: 'user', content: String(message || '') },
  ];

  let reply = '';
  let usedTools = false;

  for (let step = 0; step < MAX_STEPS; step += 1) {
    const response = await llm.chat(messages, { tools: toolkit.schemas, temperature: 0.5, maxTokens: 1400 });

    if (response.toolCalls.length === 0) {
      reply = String(response.content || '').trim();
      break;
    }

    usedTools = true;
    messages.push(response.raw);

    for (const call of response.toolCalls) {
      let args = {};
      try {
        args = call.function?.arguments ? JSON.parse(call.function.arguments) : {};
      } catch (error) {
        args = {};
      }
      const result = await toolkit.execute(call.function?.name, args);
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result).slice(0, 4000),
      });
    }
  }

  return { reply, usedTools, toolkit };
}

/* ─────────────────── deterministic (no-LLM) planner ─────────────────── */

function runPlannerTurn(state, message, pendingQuestionKey = null) {
  const text = String(message || '').trim();

  // ── 1. Corrections come first. "Change the amount to $250k" is an amendment
  //       to the ticket, never an answer to the question Steve just asked.
  const amendment = parseAmendment(text, state.order);
  if (amendment) {
    state.order = mergeOrder(state.order, { [amendment.key]: amendment.value });
    const missingAfter = missingRequired(state.order);
    const head = `Updated ${amendment.label.toLowerCase()} to ${formatAmendmentValue(amendment)}.`;

    if (missingAfter.length) {
      const question = nextQuestion(state.order);
      return { reply: `${head} ${question.question}`, questionKey: question.key, amended: amendment };
    }

    return {
      reply: `${head}\n\n${summarizeOrder(state.order).join('\n')}\n\nShall I write it now?`,
      questionKey: null,
      amended: amendment,
    };
  }

  // ── 2. An answer to the line Steve just asked for — but only if it looks
  //       like a value for that line. A paragraph is a story, not an org name.
  if (pendingQuestionKey && text && !/^(skip|none|no|no thanks|n\/a)$/i.test(text)) {
    if (SHORT_SLOTS.has(pendingQuestionKey) && looksLikeProse(text)) {
      if (isBlank(state.order.need_statement)) {
        state.order = mergeOrder(state.order, { need_statement: text });
        return {
          reply: `That reads like the project story, so I saved it as the need. ${SLOTS[pendingQuestionKey].question}`,
          questionKey: pendingQuestionKey,
        };
      }
      return {
        reply: `That's longer than I need for ${SLOTS[pendingQuestionKey].label.toLowerCase()}. ${SLOTS[pendingQuestionKey].question}`,
        questionKey: pendingQuestionKey,
      };
    }
    state.order = mergeOrder(state.order, { [pendingQuestionKey]: text });
  }

  const missing = missingRequired(state.order);
  if (missing.length) {
    const question = nextQuestion(state.order);
    return {
      reply: `Got it. ${question.question}`,
      questionKey: question.key,
    };
  }

  if (!state.docHtml) {
    return {
      reply: `Perfect — I have everything I need:\n\n${summarizeOrder(state.order).join('\n')}\n\nShall I write it now?`,
      questionKey: null,
    };
  }

  return { reply: 'Your draft is ready. You can download it, or tell me what to change.', questionKey: null };
}

/** Render an amendment value the way the applicant gave it. */
function formatAmendmentValue(amendment) {
  if (amendment.key === 'request_amount') return formatAmount(amendment.value);
  return String(amendment.value);
}

/* ─────────────────────────── deterministic guard ─────────────────────────── */

function enforceGuardrail(state, reply, intent) {
  let out = String(reply || '').trim();

  if (!isComplete(state.order)) {
    const next = nextQuestion(state.order);
    if (next && !out.includes('?')) {
      out = `${out}\n\n${next.question}`.trim();
    }
    return out;
  }

  if (!state.docHtml) {
    const blockers = validateOrder(state.order);
    if (blockers.length) {
      return `${out}\n\n${blockers.join(' ')}`.trim();
    }
    if (!out.includes('?')) {
      out = `${out}\n\n${summarizeOrder(state.order).join('\n')}\n\nShall I write it now?`.trim();
    }
    return out;
  }

  if (state.status === 'ready_for_review' && !/score|ready|review/i.test(out)) {
    out = `${out}\n\nYour grant is ready for your review — Checkmate scored it ${state.score ?? 'n/a'}/100.`;
  }
  return out;
}

function suggestionsFor(state) {
  if (!isComplete(state.order)) {
    const next = nextQuestion(state.order);
    return (next && SUGGESTIONS[next.key]) || [];
  }
  if (!state.docHtml) return ['Yes, write it', 'Let me add something first'];
  const chips = ['Download PDF', 'Download DOCX', 'Make it stronger', 'Open in editor'];
  return chips;
}

/* ─────────────────────────────── public API ─────────────────────────────── */

/**
 * Run one turn of the conversation.
 *
 * @param {object} params
 * @param {object|null} params.user  Authenticated user (or null when signed out)
 * @param {string} params.userId     Session key (user id, or a device/guest id)
 * @param {string} params.message    The applicant's message
 * @param {object} [params.context]  Page/mode hints from the client
 */
async function runSteveTurn({ user, userId, message, context = {} }) {
  const sessionKey = String(user?.id || userId || context.guestId || 'guest');

  if (!String(message || '').trim()) {
    return { reply: 'What would you like to do? I can write you a grant.', intent: 'general', status: 'intake' };
  }

  const session = await store.getOrCreateSession(sessionKey);
  await store.appendMessage(session, 'user', message);

  const state = {
    status: session.status || 'intake',
    order: session.order && typeof session.order === 'object' ? session.order : {},
    docTitle: session.docTitle || null,
    docHtml: session.docHtml || null,
    draftId: session.draftId || null,
    score: session.score ?? null,
    scoreReport: session.scoreReport || null,
    style: session.style || 'full_proposal',
    optionalBudget: 3,
    usedLLM: false,
  };

  const tier = user?.tier || 'free';
  const intent = detectIntent(message, state);
  let engine = llm.isEnabled() ? 'agent' : 'planner';
  let llmError = null;

  try {
    switch (intent) {
      case 'reset': {
        await store.resetSession(sessionKey);
        const fresh = {
          reply:
            "Fresh start. I'm Steve — tell me about the grant you need and I'll take the order from there.\n\nWho is the grant for?",
          intent: 'reset',
          status: 'intake',
          order: {},
          progress: orderProgress({}),
          engine,
        };
        const newSession = await store.getOrCreateSession(sessionKey);
        await store.appendMessage(newSession, 'assistant', fresh.reply);
        return fresh;
      }

      case 'download': {
        const payload = buildDownloadPayload(state, user);
        const reply = state.docHtml
          ? `Here you go — your grant${state.docTitle ? ` ("${state.docTitle}")` : ''} is ready to download${user?.id ? '' : '. Sign in and I will save it to your workspace too'}.`
          : "There's nothing to download yet — give me the grant details first and I'll write it.";
        await store.appendMessage(session, 'assistant', reply);
        await store.saveSession(session, state);
        return { reply, intent, ...payload, ...statePayload(state) };
      }

      default:
        break;
    }

    if (intent === 'amend') {
      const amendment = parseAmendment(message, state.order);
      state.order = mergeOrder(state.order, { [amendment.key]: amendment.value });
      const head = `Updated ${amendment.label.toLowerCase()} to ${
        amendment.key === 'request_amount' ? formatAmount(amendment.value) : amendment.value
      }.`;

      let reply;
      if (!isComplete(state.order)) {
        reply = `${head} ${nextQuestion(state.order).question}`;
      } else if (state.docHtml) {
        // The draft already exists, so re-make it with the corrected ticket.
        const toolkit = createToolkit({ state, user, tier });
        const result = await toolkit.execute('create_draft', { style: state.style });
        reply = result.ok
          ? `${head} I rewrote “${result.title}” — Checkmate now scores it ${result.scoreReport?.score ?? 'n/a'}/100.`
          : `${head} I need one more detail before I can rewrite it.`;
      } else {
        reply = `${head}\n\n${summarizeOrder(state.order).join('\n')}\n\nShall I write it now?`;
      }

      await store.appendMessage(session, 'assistant', reply, { intent: 'amend', questionKey: null });
      await store.saveSession(session, state);
      return {
        reply,
        intent: 'amend',
        ...statePayload(state),
        ...buildDownloadPayload(state, user),
        suggestions: suggestionsFor(state),
        engine,
      };
    }

    if (intent === 'confirm_draft') {
      const toolkit = createToolkit({ state, user, tier });
      const result = await toolkit.execute('create_draft', { style: state.style });
      const title = result.title || deriveTitle(state.order);
      const reply = result.ok
        ? `Done. I wrote "${title}" and ran Checkmate on it — it scored ${result.scoreReport?.score ?? 'n/a'}/100. ${result.needsSignIn ? 'Sign in and I will save it to your workspace.' : 'It is saved in your workspace and ready for your review.'}`
        : result.reason === 'order_invalid' && result.blockers?.length
          ? result.blockers.join(' ')
          : 'I need one more detail before I can write it.';
      await store.appendMessage(session, 'assistant', reply, { intent, draftId: state.draftId });
      await store.saveSession(session, state);
      return { reply, intent: 'draft_ready', ...statePayload(state), ...buildDownloadPayload(state, user), suggestions: suggestionsFor(state), engine };
    }

    if (intent === 'score' && state.docHtml) {
      const toolkit = createToolkit({ state, user, tier });
      const result = await toolkit.execute('score_draft', {});
      const report = result.scoreReport;
      const reply = `Checkmate gives it ${report.score}/100 (${report.label}).\n\nStrong: ${(report.strengths || []).slice(0, 3).join('; ') || 'n/a'}.\n\nTo fix: ${(report.fixes || []).slice(0, 3).join(' ') || 'nothing major'}`;
      await store.appendMessage(session, 'assistant', reply, { intent });
      await store.saveSession(session, state);
      return { reply, intent: 'score', ...statePayload(state), suggestions: suggestionsFor(state), engine };
    }

    if (intent === 'improve' && state.docHtml) {
      const toolkit = createToolkit({ state, user, tier });
      const result = await toolkit.execute('apply_fixes', {});
      const report = result.scoreReport;
      const reply = result.ok
        ? `Applied ${result.appliedCount} fix${result.appliedCount === 1 ? '' : 'es'} to ${result.appliedTo}. Checkmate now scores it ${report.score}/100 (${report.label}).`
        : 'There are no outstanding fixes to apply — the draft is already clean.';
      await store.appendMessage(session, 'assistant', reply, { intent });
      await store.saveSession(session, state);
      return { reply, intent: 'improve', ...statePayload(state), ...buildDownloadPayload(state, user), suggestions: suggestionsFor(state), engine };
    }

    if (intent === 'open_editor') {
      const reply = state.draftId
        ? 'Opening your draft in the editor.'
        : "Your draft isn't saved yet — sign in and I'll save it so you can edit it.";
      await store.appendMessage(session, 'assistant', reply);
      await store.saveSession(session, state);
      return { reply, intent, ...statePayload(state), engine };
    }

    // ── Primary path: the agent (or the planner fallback) ──
    const history = await store.getHistory(session, 20);

    // Which line did Steve ask for last turn? The planner needs this so it only
    // files an answer against a question it actually asked.
    const lastAssistant = [...history].reverse().find((row) => row.role === 'assistant');
    const pendingQuestionKey = lastAssistant?.metadata?.questionKey || null;

    let reply = '';
    if (engine === 'agent') {
      try {
        const result = await runToolLoop({ state, user, tier, message, history });
        reply = result.reply;
        state.usedLLM = true;
      } catch (error) {
        llmError = sanitizeError(error?.message || error);
        console.warn('[STEVE] agent loop failed, falling back to planner:', llmError);
        engine = 'planner';
        reply = runPlannerTurn(state, message, pendingQuestionKey).reply;
      }
    } else {
      reply = runPlannerTurn(state, message, pendingQuestionKey).reply;
    }

    reply = enforceGuardrail(state, reply, intent);

    // Remember the line we just asked for, so the next reply files correctly.
    const askedQuestionKey = isComplete(state.order) ? null : nextQuestion(state.order)?.key || null;

    // If the agent wrote a draft mid-turn, make sure the handoff copy is right.
    if (state.docHtml && !state.draftId && user?.id) {
      await store.saveSession(session, state);
    }
    if (state.status === 'ready_for_review' && state.docHtml) {
      await notifyReadyForReviewSafe({ user, state });
    }

    await store.appendMessage(session, 'assistant', reply, {
      intent,
      draftId: state.draftId,
      questionKey: askedQuestionKey,
    });
    await store.saveSession(session, state);

    return {
      reply,
      intent: state.docHtml ? 'draft_ready' : 'intake',
      ...statePayload(state),
      ...buildDownloadPayload(state, user),
      suggestions: suggestionsFor(state),
      engine,
      llmError,
    };
  } catch (error) {
    console.error('[STEVE] turn failed:', error?.message || error);
    const reply = 'Sorry — something went wrong on my side. Could you say that again?';
    try {
      await store.appendMessage(session, 'assistant', reply);
    } catch (inner) {
      /* ignore */
    }
    return { reply, intent: 'error', status: 'intake', engine };
  }
}

/** Never let a provider error echo a credential back to the client. */
function sanitizeError(message) {
  return String(message || '')
    .replace(/sk-[A-Za-z0-9_-]{6,}/g, '[redacted]')
    .replace(/\b[A-Za-z0-9_-]{40,}\b/g, '[redacted]')
    .slice(0, 300);
}

async function notifyReadyForReviewSafe({ user, state }) {
  if (!user?.email || state.notifiedAt) return;
  try {
    await notifyReadyForReview({ user, draft: { id: state.draftId, title: state.docTitle }, score: state.score });
  } catch (error) {
    console.warn('[STEVE] ready notification skipped:', error?.message || error);
  }
}

function statePayload(state) {
  return {
    status: state.status,
    progress: orderProgress(state.order),
    order: state.order,
    draftId: state.draftId,
    draftTitle: state.docTitle,
    docHtml: state.docHtml || null,
    score: state.score,
    scoreReport: state.scoreReport,
    hasDraft: Boolean(state.docHtml),
    editedSections: state.docHtml ? Object.keys(parseSections(state.docHtml)) : [],
    engine: state.usedLLM ? 'agent' : 'planner',
  };
}

function buildDownloadPayload(state, user) {
  if (!state.draftId || !user?.id) return { download: null };
  return {
    download: {
      pdf: `/api/drafts/${state.draftId}/export.pdf`,
      docx: `/api/drafts/${state.draftId}/export.docx`,
    },
  };
}

/** Rehydrate the panel on page load. */
async function getSessionView({ user, userId }) {
  const sessionKey = String(user?.id || userId || 'guest');
  const session = await store.getOrCreateSession(sessionKey);
  const history = await store.getHistory(session, 30);
  const state = {
    status: session.status,
    order: session.order || {},
    docTitle: session.docTitle,
    docHtml: session.docHtml,
    draftId: session.draftId,
    score: session.score,
    scoreReport: session.scoreReport,
  };
  return {
    sessionId: session.id,
    status: session.status,
    progress: orderProgress(state.order),
    order: state.order,
    orderSummary: summarizeOrder(state.order),
    draftId: state.draftId,
    draftTitle: state.docTitle,
    docHtml: state.docHtml || null,
    score: state.score,
    scoreReport: state.scoreReport,
    hasDraft: Boolean(state.docHtml),
    editedSections: state.docHtml ? Object.keys(parseSections(state.docHtml)) : [],
    download: state.draftId && user?.id
      ? {
          pdf: `/api/drafts/${state.draftId}/export.pdf`,
          docx: `/api/drafts/${state.draftId}/export.docx`,
        }
      : null,
    suggestions: suggestionsFor(state),
    messages: history.map((row) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      timestamp: row.createdAt,
    })),
  };
}

module.exports = {
  runSteveTurn,
  getSessionView,
  buildSystemPrompt,
  detectIntent,
  UPGRADE_LINK,
  SUGGESTIONS,
};
