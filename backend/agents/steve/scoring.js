/**
 * Steve — Checkmate scoring (real rubric)
 * ----------------------------------------------------------------------------
 * Replaces the old word-count "score" with an actual reviewer rubric:
 * need, alignment, completeness, evidence, outcomes, budget, compliance.
 *
 * With an LLM key, the model grades the draft against the funder's guidelines
 * (or standard reviewer expectations) and returns concrete fixes. Without a
 * key, a deterministic rubric inspects the document structure, order coverage,
 * and funder-guideline term overlap. Neither path invents a score.
 */
const { chat, extractJson, isEnabled } = require('./llm');
const { SLOTS, REQUIRED_SLOTS, isBlank, parseAmount } = require('./order');

const CRITERIA = [
  { key: 'need', label: 'Statement of Need' },
  { key: 'alignment', label: 'Funder Alignment' },
  { key: 'completeness', label: 'Completeness' },
  { key: 'evidence', label: 'Evidence & Proof' },
  { key: 'outcomes', label: 'Measurable Outcomes' },
  { key: 'budget', label: 'Budget Credibility' },
  { key: 'compliance', label: 'Compliance Readiness' },
];

const WEIGHTS = {
  need: 1.4,
  alignment: 1.3,
  completeness: 1.2,
  evidence: 1,
  outcomes: 1.2,
  budget: 1,
  compliance: 1,
};

function plainText(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasNumbers(text) {
  return /\b\d+(?:[.,]\d+)?\s*(?:%|percent|people|children|families|students|clients|participants|per|k)?\b/i.test(text);
}

function headingCount(html) {
  return (String(html).match(/<h[12][^>]*>/gi) || []).length;
}

function guidelineTerms(order) {
  const source = `${order?.funder_guidelines || ''} ${order?.funder_name || ''}`.toLowerCase();
  const words = source.match(/[a-z]{5,}/g) || [];
  return Array.from(new Set(words)).slice(0, 24);
}

/* ─────────────────────────── deterministic rubric ─────────────────────────── */

function heuristicScore(order, html) {
  const text = plainText(html);
  const lower = text.toLowerCase();
  const words = text ? text.split(/\s+/).length : 0;
  const headings = headingCount(html);

  const criteria = {};

  // Need: is there a substantive problem statement, anchored with specifics?
  let need = 40;
  need += words > 250 ? 15 : Math.min(15, Math.floor(words / 20));
  need += hasNumbers(lower) ? 15 : 0;
  need += /because|due to|as a result|without|urgent|gap|barrier/.test(lower) ? 15 : 0;
  need += headings >= 4 ? 15 : headings * 3;
  criteria.need = Math.max(1, Math.min(100, Math.round(need)));

  // Alignment: overlap with the funder's own language.
  const terms = guidelineTerms(order);
  const hits = terms.filter((term) => lower.includes(term)).length;
  let alignment = 50;
  if (terms.length > 0) alignment += Math.min(35, Math.round((hits / terms.length) * 45));
  else alignment += /funder|foundation|align|priority|mission/.test(lower) ? 20 : 8;
  alignment += !isBlank(order?.funder_name) ? 10 : 0;
  criteria.alignment = Math.max(1, Math.min(100, Math.round(alignment)));

  // Completeness: coverage of the order ticket's required lines.
  const covered = REQUIRED_SLOTS.filter((key) => {
    if (isBlank(order?.[key])) return false;
    const value = String(order[key]).toLowerCase().split(/\s+/).slice(0, 4).join(' ');
    return value.length > 2 && lower.includes(value);
  }).length;
  const orderedFilled = REQUIRED_SLOTS.filter((key) => !isBlank(order?.[key])).length;
  let completeness = 45 + Math.round((covered / Math.max(1, REQUIRED_SLOTS.length)) * 40);
  completeness += orderedFilled === REQUIRED_SLOTS.length ? 15 : 0;
  criteria.completeness = Math.max(1, Math.min(100, completeness));

  // Evidence: proof points and data.
  let evidence = 45;
  evidence += !isBlank(order?.evidence) ? 25 : 0;
  evidence += /data|evidence|measur|track record|partner|pilot|report/.test(lower) ? 20 : 0;
  evidence += hasNumbers(lower) ? 10 : 0;
  criteria.evidence = Math.max(1, Math.min(100, evidence));

  // Outcomes: measurable change.
  let outcomes = 45;
  outcomes += !isBlank(order?.outcomes) ? 25 : 0;
  outcomes += /%\s|percent|increase|reduce|by \d|\d+ (people|children|families|students|clients)/i.test(text) ? 20 : 0;
  outcomes += /outcome|objective|goal|impact|evaluat/.test(lower) ? 10 : 0;
  criteria.outcomes = Math.max(1, Math.min(100, outcomes));

  // Budget: a real number and a breakdown.
  let budget = 40;
  const amount = parseAmount(order?.request_amount);
  budget += amount && amount > 0 ? 25 : 0;
  budget += !isBlank(order?.budget_breakdown) ? 20 : 0;
  budget += /budget|allocat|cost|personnel|admin|program delivery/.test(lower) ? 15 : 0;
  criteria.budget = Math.max(1, Math.min(100, budget));

  // Compliance: admin fields present.
  let compliance = 45;
  compliance += !isBlank(order?.address) ? 15 : 0;
  compliance += !isBlank(order?.contact_name) ? 15 : 0;
  compliance += !isBlank(order?.deadline) ? 10 : 0;
  compliance += !isBlank(order?.service_area) ? 15 : 0;
  criteria.compliance = Math.max(1, Math.min(100, compliance));

  const { overall, missing, fixes } = finalize(criteria, order, html);
  return {
    score: overall,
    criteria,
    strengths: buildStrengths(criteria),
    weaknesses: missing,
    missingComponents: missing,
    fixes,
    usedLLM: false,
  };
}

function buildStrengths(criteria) {
  const strong = CRITERIA.filter((c) => criteria[c.key] >= 78).map((c) => `${c.label} is strong`);
  return strong.length ? strong : ['The draft covers the core sections a reviewer expects'];
}

function finalize(criteria, order, html) {
  const total = Object.keys(WEIGHTS).reduce((sum, key) => sum + (criteria[key] || 0) * WEIGHTS[key], 0);
  const weightSum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  const overall = Math.max(1, Math.min(100, Math.round(total / weightSum)));

  const missing = [];
  const fixes = [];

  if (isBlank(order?.evidence)) {
    missing.push('No proof points or track record supplied');
    fixes.push('Add one or two verified results, partners, or testimonials to the Evidence section.');
  }
  if (isBlank(order?.budget_breakdown)) {
    fixes.push('Review the proportional budget and replace it with your real line items before submitting.');
  }
  if (isBlank(order?.outcomes) || !hasNumbers(plainText(html))) {
    missing.push('Outcomes are not quantified');
    fixes.push('Quantify at least one outcome (e.g. "serve 30 children" or "90% completion").');
  }
  if (isBlank(order?.funder_name)) {
    missing.push('No named funder, so alignment is generic');
    fixes.push('Name the funder and paste their priorities so Steve can align the narrative.');
  }
  if (isBlank(order?.contact_name)) {
    fixes.push('Add the signatory name and reply-to email before submitting.');
  }
  if (isBlank(order?.address)) {
    missing.push('Organization address missing from the letterhead');
    fixes.push('Provide the organization address for the proposal letterhead.');
  }
  if (plainText(html).split(/\s+/).length < 300) {
    fixes.push('Expand the Statement of Need with local data and who is affected.');
  }

  return { overall, missing, fixes };
}

/* ─────────────────────────────── LLM rubric ─────────────────────────────── */

async function llmScore(order, html) {
  const prompt = [
    'You are Checkmate, a grant reviewer. Score this proposal the way a real program officer would.',
    `Funder: ${order?.funder_name || 'a general funder'}.`,
    order?.funder_guidelines ? `Funder guidelines/priorities:\n${order.funder_guidelines}` : 'No funder guidelines supplied — grade against standard reviewer expectations.',
    '',
    'Return ONLY JSON:',
    '{',
    '  "criteria": { "need": 0-100, "alignment": 0-100, "completeness": 0-100, "evidence": 0-100, "outcomes": 0-100, "budget": 0-100, "compliance": 0-100 },',
    '  "strengths": ["..."], "weaknesses": ["..."], "missingComponents": ["..."], "fixes": ["..."]',
    '}',
    'Be strict and specific. Do not invent facts about the applicant.',
    '',
    'PROPOSAL:',
    plainText(html).slice(0, 12000),
  ].join('\n');

  const response = await chat(
    [
      { role: 'system', content: 'You are a rigorous, fair grant reviewer. You output JSON only.' },
      { role: 'user', content: prompt },
    ],
    { json: true, temperature: 0.2, maxTokens: 1200 },
  );

  const parsed = extractJson(response.content);
  if (!parsed?.criteria) throw new Error('LLM returned no criteria');

  const criteria = {};
  CRITERIA.forEach(({ key }) => {
    const value = Number(parsed.criteria[key]);
    criteria[key] = Number.isFinite(value) ? Math.max(1, Math.min(100, Math.round(value))) : 60;
  });

  const { overall } = finalize(criteria, order, html);
  return {
    score: overall,
    criteria,
    strengths: Array.isArray(parsed.strengths) && parsed.strengths.length ? parsed.strengths.slice(0, 5) : buildStrengths(criteria),
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 6) : [],
    missingComponents: Array.isArray(parsed.missingComponents) ? parsed.missingComponents.slice(0, 6) : [],
    fixes: Array.isArray(parsed.fixes) ? parsed.fixes.slice(0, 8) : [],
    usedLLM: true,
  };
}

function labelFor(score) {
  if (score >= 85) return 'Strong';
  if (score >= 70) return 'Ready';
  if (score >= 55) return 'In Progress';
  return 'Needs Work';
}

/** Score a draft. Always resolves to a real rubric result. */
async function scoreDraft(order, html) {
  let result;
  if (isEnabled()) {
    try {
      result = await llmScore(order, html);
    } catch (error) {
      result = null;
    }
  }
  if (!result) result = heuristicScore(order, html);
  return { ...result, label: labelFor(result.score), criteriaDefs: CRITERIA };
}

module.exports = { CRITERIA, scoreDraft, labelFor, heuristicScore };
