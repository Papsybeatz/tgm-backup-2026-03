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

function clamp(value) {
  return Math.max(1, Math.min(100, Math.round(value)));
}

/** Any unmistakable money figure, used by the document-only rubric. */
const MONEY_IN_TEXT = /(?:[$€£]\s?[\d,]+(?:\.\d+)?\s*(?:k|m|million|thousand)?|\b[\d,]+\s*(?:usd|dollars?)\b)/i;

/** Words that are legitimately lowercase inside a Title Case heading. */
const SMALL_WORD = /^(of|and|the|for|to|in|on|a|an|or|with|at|by|from|as|per)$/i;

/**
 * Does this plain-text line read as a heading rather than a sentence?
 *
 * The upload path hands us extracted plain text, where there are no <h1>/<h2>
 * tags to count. Without this, every uploaded proposal would look like it had
 * zero sections and be scored down for structure it actually has.
 */
function looksLikeHeading(line) {
  const cleaned = String(line)
    .replace(/^\s*[-•*·]\s*/, '')
    .replace(/^\s*\d+[.)]\s*/, '')
    .trim();
  if (cleaned.length < 3 || cleaned.length > 80) return false;
  if (/[.:;,]$/.test(cleaned)) return false;
  const words = cleaned.split(/\s+/);
  if (words.length > 10) return false;
  const isCaps = cleaned === cleaned.toUpperCase() && /[A-Z]/.test(cleaned);
  const isTitle = words.every((word, i) => /^[A-Z0-9]/.test(word) || (i > 0 && SMALL_WORD.test(word)));
  return isCaps || isTitle;
}

/**
 * Heading count that works for both the editor (HTML) and uploads (plain text).
 * Prefers real markup when it exists, and never double-counts.
 */
function countHeadings(content) {
  const raw = String(content || '');
  const markup = (raw.match(/<h[12][^>]*>/gi) || []).length;
  if (markup > 0) return markup;
  return raw.split(/\n+/).map((line) => line.trim()).filter(looksLikeHeading).length;
}

/**
 * Section markers that distinguish a full proposal from a one-page letter.
 * Shared by detectStyle() and the document-only completeness criterion.
 */
const PROPOSAL_MARKERS = [
  /executive summary/i,
  /statement of need|statement of the problem|needs statement/i,
  /organization(al)? background|organisational background|about (the|our) organi[sz]ation/i,
  /project description|program(me)? description|project narrative/i,
  /goals?\s*(&|and)\s*objectives?/i,
  /outcomes?\s*(&|and)\s*evaluation|evaluation plan/i,
  /budget narrative|budget breakdown|budget justification/i,
  /sustainab(ility|le)/i,
  /timeline|implementation schedule|work plan/i,
];

/**
 * Infer the deliverable shape from the document alone.
 *
 * Order-less scoring has no ticket to say whether this is a letter or a
 * proposal, and judging both by the proposal's shape is exactly what drove
 * letters into the 50s. Detect it from structure instead.
 */
function detectStyle(content) {
  const text = plainText(content);
  const words = text ? text.split(/\s+/).length : 0;
  const markers = PROPOSAL_MARKERS.filter((re) => re.test(text)).length;
  // Two or more real sections is structural evidence, whatever the length.
  if (markers >= 2) return 'proposal';
  if (words < 450) return 'letter';
  return 'proposal';
}

function guidelineTerms(order) {
  const source = `${order?.funder_guidelines || ''} ${order?.funder_name || ''}`.toLowerCase();
  const words = source.match(/[a-z]{5,}/g) || [];
  return Array.from(new Set(words)).slice(0, 24);
}

/* ─────────────────────────── deterministic rubric ─────────────────────────── */

function heuristicScore(order, html, style = 'letter') {
  const text = plainText(html);
  const lower = text.toLowerCase();
  const words = text ? text.split(/\s+/).length : 0;
  const headings = headingCount(html);
  // A letter is legitimately shorter and has fewer sections than a proposal.
  // Judging both by the proposal's shape is what drove letters into the 50s.
  const isLetter = style === 'letter';
  const expectedHeadings = isLetter ? 5 : 10;
  const minWords = isLetter ? 180 : 400;

  const criteria = {};

  // Need: is there a substantive problem statement, anchored with specifics?
  let need = 40;
  need += words > 250 ? 15 : Math.min(15, Math.floor(words / 20));
  need += hasNumbers(lower) ? 15 : 0;
  need += /because|due to|as a result|without|urgent|gap|barrier/.test(lower) ? 15 : 0;
  need += headings >= expectedHeadings - 1 ? 15 : headings * 3;
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

  const { overall, missing, fixes } = finalize(criteria, order, html, style);
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

/* ──────────────────── document-only rubric (public upload) ─────────────────── */

/**
 * The document-only rubric.
 *
 * `heuristicScore` reads the order ticket for five of its seven criteria, so
 * running it with an empty order would punish a good draft for information the
 * tool was never given. This variant derives every criterion from the document
 * itself, which is all the anonymous upload path has.
 *
 * It deliberately shares the criteria, weights and bands with the ticket
 * rubric so a score means the same thing on both surfaces.
 */
function heuristicScoreOrderless(html, style = 'proposal') {
  const text = plainText(html);
  const lower = text.toLowerCase();
  const words = text ? text.split(/\s+/).length : 0;
  const headings = countHeadings(html);
  const isLetter = style === 'letter';
  const expectedHeadings = isLetter ? 5 : 10;

  const criteria = {};

  // Need — the same document-anchored signals the ticket rubric uses.
  let need = 40;
  need += words > 250 ? 15 : Math.min(15, Math.floor(words / 20));
  need += hasNumbers(lower) ? 15 : 0;
  need += /because|due to|as a result|without|urgent|gap|barrier/.test(lower) ? 15 : 0;
  need += headings >= expectedHeadings - 1 ? 15 : headings * 3;
  criteria.need = clamp(need);

  // Alignment — no guidelines are available, so score the document's own
  // evidence that it was written for a specific funder.
  let alignment = 45;
  alignment += /funder|foundation|grantor|sponsor/.test(lower) ? 15 : 0;
  alignment += /priorit(y|ies)|mission|focus area|strategic (plan|goal)/.test(lower) ? 15 : 0;
  alignment += /align|consistent with|in line with|matches/.test(lower) ? 10 : 0;
  alignment += headings >= 3 ? 10 : 0;
  criteria.alignment = clamp(alignment);

  // Completeness — section coverage measured against the document's own shape.
  const markers = PROPOSAL_MARKERS.filter((re) => re.test(text)).length;
  let completeness = 40;
  completeness += Math.min(45, markers * (isLetter ? 9 : 5));
  completeness += headings >= expectedHeadings ? 15 : headings * 1.5;
  criteria.completeness = clamp(completeness);

  // Evidence — proof points and data, read off the page.
  let evidence = 40;
  evidence += /\bdata\b|evidence|measur|track record|partner|pilot|report|case study|testimonial/i.test(lower) ? 25 : 0;
  evidence += hasNumbers(lower) ? 15 : 0;
  evidence += /\b(19|20)\d{2}\b/.test(text) ? 10 : 0;
  criteria.evidence = clamp(evidence);

  // Outcomes — measurable change.
  let outcomes = 40;
  outcomes += /%\s|percent|increase|reduce|by \d|\d+ (people|children|families|students|clients|participants)/i.test(text) ? 25 : 0;
  outcomes += /outcome|objective|goal|impact|evaluat/.test(lower) ? 20 : 0;
  outcomes += /baseline|target|milestone|kpi|indicator/.test(lower) ? 10 : 0;
  criteria.outcomes = clamp(outcomes);

  // Budget — a real money figure plus a breakdown.
  let budget = 35;
  budget += MONEY_IN_TEXT.test(text) ? 30 : 0;
  budget += /budget|allocat|cost|personnel|admin|line item|expense/.test(lower) ? 20 : 0;
  budget += /narrative|breakdown|justif/.test(lower) ? 10 : 0;
  criteria.budget = clamp(budget);

  // Compliance — the administrative furniture a submission needs.
  let compliance = 35;
  compliance += /\b\d{1,5}\s+[A-Z][A-Za-z]+(\s+[A-Za-z]+)*\s+(street|st\.?|avenue|ave\.?|road|rd\.?|boulevard|blvd\.?|drive|dr\.?|lane|ln\.?|way|suite|ste\.?)\b/i.test(text) ? 15 : 0;
  compliance += /[^\s@]+@[^\s@]+\.[^\s@]{2,}/.test(text) ? 15 : 0;
  compliance += /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(text) ? 10 : 0;
  compliance += /deadline|due (date|by)|submission date|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(lower) ? 10 : 0;
  compliance += /sincerely|respectfully|signature|authorized|on behalf of/i.test(lower) ? 15 : 0;
  criteria.compliance = clamp(compliance);

  const { overall, missing, fixes } = finalizeOrderless(criteria, html, style);
  return {
    score: overall,
    criteria,
    strengths: buildStrengths(criteria),
    weaknesses: missing,
    missingComponents: missing,
    fixes,
    usedLLM: false,
    orderless: true,
  };
}

/**
 * Overall score plus gaps, derived entirely from the document.
 * The ticket version of this (`finalize`) cannot be reused here: it reports
 * "organization address missing" and similar from ticket fields that an
 * uploaded draft was never asked to fill.
 */
function finalizeOrderless(criteria, html, style = 'proposal') {
  const isLetter = style === 'letter';
  const total = Object.keys(WEIGHTS).reduce((sum, key) => sum + (criteria[key] || 0) * WEIGHTS[key], 0);
  const weightSum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  const overall = clamp(total / weightSum);

  const text = plainText(html);
  const lower = text.toLowerCase();
  const missing = [];
  const fixes = [];

  if (!hasNumbers(text)) {
    missing.push('No quantified data anywhere in the document');
    fixes.push('Anchor the need with a local number — how many people, and how you know.');
  }
  if (!/%\s|percent|increase|reduce|by \d|\d+ (people|children|families|students|clients|participants)/i.test(text)) {
    missing.push('Outcomes are not quantified');
    fixes.push('Quantify at least one outcome (e.g. "serve 30 children" or "90% completion").');
  }
  if (!MONEY_IN_TEXT.test(text)) {
    missing.push('No budget figure found in the document');
    fixes.push('State the amount requested and tie it to the activities it funds.');
  }
  if (!/funder|foundation|grantor|sponsor/i.test(lower)) {
    missing.push('No named funder, so alignment cannot be judged');
    fixes.push('Name the funder explicitly and echo their stated priorities.');
  }
  if (!/sincerely|respectfully|signature|authorized|on behalf of/i.test(lower)) {
    fixes.push('Add a signatory block before submitting.');
  }
  if (isLetter && text.split(/\s+/).length < 180) {
    fixes.push('Expand the Statement of Need with local data and who is affected.');
  }

  return { overall, missing, fixes };
}

function finalize(criteria, order, html, style = 'letter') {
  const isLetter = style === 'letter';
  const minWords = isLetter ? 180 : 400;
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
  if (isLetter && plainText(html).split(/\s+/).length < minWords) {
    fixes.push('Expand the Statement of Need with local data and who is affected.');
  }

  return { overall, missing, fixes };
}

/* ─────────────────────────────── LLM rubric ─────────────────────────────── */

async function llmScore(order, html, style = 'letter', orderless = false) {
  const criteriaKeys = CRITERIA.map((c) => `"${c.key}"`).join(', ');
  const isLetter = style === 'letter';
  const deliverable = isLetter ? 'one-page grant letter' : 'full grant proposal';
  const sections = isLetter
    ? 'Opening, Statement of Need, Project Description, Budget Request, Conclusion'
    : 'Executive Summary, Statement of Need, Organization Background, Project Description, Goals & Objectives, Outcomes & Evaluation, Budget Narrative, Sustainability, Timeline, Conclusion';

  const prompt = [
    `You are Checkmate, a grant reviewer. Grade the ${deliverable} below against this anchored rubric.`,
    `This deliverable has exactly these sections: ${sections}.`, isLetter
      ? 'Do NOT penalise a letter for lacking proposal sections such as Executive Summary, Organization Background, Sustainability or Timeline — they are not part of this deliverable, and a letter is expected to be short.'
      : '',
    orderless
      ? 'This draft was uploaded directly, with no intake form. Judge only what is on the page, and do not report anything as missing that a standalone draft would not be expected to contain.'
      : '',
    '',
    'BANDS — use the whole range, do not cluster at one value:',
    '- 90-100 exceptional: quantified local data, documented evidence or partners, a budget tied line-by-line to activities, and language mirroring the funder\u2019s stated priorities.',
    '- 78-89 strong and funder-ready: complete and specific, well structured, only minor gaps in data or evidence. THIS IS THE NORMAL BAND FOR A COMPLETE, COMPETENT PROPOSAL.',
    '- 65-77 adequate but thin: the structure is there, but specifics, data or evidence are missing.',
    '- 50-64 weak: generic claims, important components absent.',
    '- Below 50: not submission-ready.',
    '',
    'CALIBRATION RULES:',
    isLetter
      ? '- A complete, competent letter with a clear ask, a stated need, named beneficiaries, what the money does, and a closing should land 78-88. Length is not a virtue; do not reward padding.'
      : '- A proposal with all core sections, a stated need, named beneficiaries, an amount, and measurable outcomes should land 76-86.',
    '- Do NOT deduct for information the applicant was never asked to provide.',
    '- Reserve 90+ for drafts with quantified local data AND documented proof.',
    '- Do not reward length or padding, and do not penalise brevity.',
    '- Judge only what is on the page.',
    '',
    `Funder: ${order?.funder_name || 'a general funder'}.`,
    order?.funder_guidelines
      ? `Funder guidelines/priorities to grade alignment against:\n${order.funder_guidelines}`
      : 'No funder guidelines supplied — grade against standard reviewer expectations.',
    '',
    'Return ONLY JSON of this shape:',
    `{"criteria": {${criteriaKeys}}, "strengths": ["..."], "weaknesses": ["..."], "missingComponents": ["..."], "fixes": ["..."]}`,
    'Every criterion is 0-100. Be specific. Never invent facts about the applicant.',
    '',
    'PROPOSAL:',
    plainText(html).slice(0, 12000),
  ].join('\n');

  const response = await chat(
    [
      { role: 'system', content: 'You are a fair, calibrated grant reviewer. You output JSON only.' },
      { role: 'user', content: prompt },
    ],
    // temperature 0: scoring must be reproducible, not a lottery.
    { json: true, temperature: 0, maxTokens: 1200, label: 'score' },
  );

  const parsed = extractJson(response.content);
  if (!parsed?.criteria) throw new Error('LLM returned no criteria');

  const criteria = {};
  CRITERIA.forEach(({ key }) => {
    const value = Number(parsed.criteria[key]);
    criteria[key] = Number.isFinite(value) ? Math.max(1, Math.min(100, Math.round(value))) : 60;
  });

  const { overall } = orderless
    ? finalizeOrderless(criteria, html, style)
    : finalize(criteria, order, html, style);
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

/**
 * Score a draft. Always resolves to a real rubric result.
 *
 * `options.orderless` switches to the document-only rubric, for callers that
 * have a draft but no order ticket (the anonymous public score). With no order
 * and no style, the shape is inferred from the document itself.
 */
async function scoreDraft(order, html, options = {}) {
  const orderless = Boolean(options.orderless);
  const style =
    options.style || order?.style || (orderless ? detectStyle(html) : 'letter');
  let result;
  if (isEnabled()) {
    try {
      result = await llmScore(order || {}, html, style, orderless);
    } catch (error) {
      result = null;
    }
  }
  if (!result) {
    result = orderless ? heuristicScoreOrderless(html, style) : heuristicScore(order, html, style);
  }
  return { ...result, label: labelFor(result.score), style, criteriaDefs: CRITERIA };
}

module.exports = {
  CRITERIA,
  scoreDraft,
  labelFor,
  heuristicScore,
  heuristicScoreOrderless,
  detectStyle,
};
