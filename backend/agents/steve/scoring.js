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

/**
 * Order-less criteria and weights — the anonymous upload path.
 *
 * `alignment` is deliberately excluded. An anonymous upload carries no funder
 * and no guidelines, so alignment cannot be judged; it previously returned an
 * identical 70 for every document while carrying the second-heaviest weight. A
 * constant masquerading as a measurement is worse than no measurement, because
 * it dilutes the criteria that do discriminate. The weight it held moves to
 * `evidence`, which is what actually separates a fundable draft from a tidy one.
 */
const ORDERLESS_CRITERIA = CRITERIA.filter((c) => c.key !== 'alignment');

const ORDERLESS_WEIGHTS = {
  need: 1.4,
  completeness: 1.2,
  evidence: 1.3,
  outcomes: 1.2,
  budget: 1,
  compliance: 1,
};

/**
 * Below this evidence score the overall is capped, however good the formatting.
 * A document with nothing a reviewer can verify is not "funder-ready", and the
 * rubric must not say it is just because it has all the right headings.
 */
const EVIDENCE_FLOOR = 50;
const EVIDENCE_FLOOR_CAP = 65;

function plainText(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Like `plainText`, but preserves line structure.
 *
 * `plainText` collapses every run of whitespace, which is right for prose
 * comparison but destroys the line breaks that heading and letterhead detection
 * depend on. Any code that reasons about lines must use this instead — feeding
 * collapsed text to a line-based split makes a whole document look like a
 * single contact line, and the document gets discarded.
 */
function plainTextLines(html) {
  return String(html || '')
    .replace(/<\/?(p|div|li|h[1-6]|tr|section|article)\b[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .split('\n')
    .map((line) => line.replace(/[ \t\u00a0]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{2,}/g, '\n')
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

/* ────────────── letterhead / body separation (public upload) ────────────── */

const SIGNOFF_PATTERN =
  /\n\s*(sincerely|respectfully|yours (truly|sincerely)|very truly yours|thank you for your consideration|with gratitude|best regards|regards)\b/i;

const STREET_WORD =
  /\b(street|st\.?|avenue|ave\.?|road|rd\.?|boulevard|blvd\.?|drive|dr\.?|lane|ln\.?|way|suite|ste\.?|p\.?o\.? box)\b/i;

/** Is this line contact or administrative furniture rather than content? */
function isContactLine(line) {
  const value = String(line).trim();
  if (!value) return false;
  // A contact entry is a short standalone line. Without this guard, a document
  // that arrived as a single line would be dropped entirely just for containing
  // an email address somewhere in it — the failure mode that made the whole
  // body disappear the first time this ran.
  if (value.length > 120) return false;
  if (/[^\s@]+@[^\s@]+\.[^\s@]{2,}/.test(value)) return true; // email
  if (/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(value)) return true; // phone
  if (/\b\d{1,5}\s+[A-Za-z]/.test(value) && STREET_WORD.test(value)) return true; // address
  if (/^\s*(deadline|due date|submission date|date)\s*[:\-]/i.test(value)) return true;
  if (/^\s*(www\.|https?:\/\/)/i.test(value)) return true; // url
  return false;
}

/**
 * Separate the part of a document that argues the case from the part that
 * administers it.
 *
 * Everything from the sign-off onward is a signature block, and contact lines
 * are removed wherever they appear. This split exists because the two were
 * previously scored together, which let a phone number satisfy `hasNumbers` and
 * a street address count as evidence: adding a letterhead to an otherwise
 * unchanged hollow draft moved it from 63 ("In Progress") to 80 ("Ready").
 *
 * This can drop a content line that happens to carry a phone number. That is
 * the accepted trade — contact details mid-narrative are rare, and treating them
 * as proof points is the failure being fixed.
 */
function stripLetterhead(text) {
  let body = String(text || '');
  const signoff = body.match(SIGNOFF_PATTERN);
  if (signoff && typeof signoff.index === 'number') body = body.slice(0, signoff.index);
  return body
    .split(/\n/)
    .filter((line) => !isContactLine(line))
    .join('\n')
    .trim();
}

/* ─────────────────────────── substance detection ─────────────────────────── */

/**
 * Floor below which a body is a fragment rather than a section.
 *
 * Deliberately low. Length is not the test — specificity is. A twelve-word
 * budget line is substantive; a forty-word paragraph of filler is not. An
 * earlier, higher gate rejected both the concise budget line and a short
 * timeline naming two months, which is exactly the false positive that makes a
 * score untrustworthy.
 */
const MIN_SECTION_WORDS = 5;

/**
 * Proper nouns that are not merely the first word of a sentence.
 * "Our program is important" yields none; "partners with the Riverbend district" yields one.
 *
 * Lines are treated as boundaries alongside sentence punctuation. Without that,
 * a heading and the sentence under it merge into one "sentence", the heading's
 * second word becomes the first word of the body, and ordinary words like "Our"
 * get counted as proper nouns — which is what let a document with no evidence
 * still score 55 on evidence.
 */
function properNouns(text) {
  const found = new Set();
  for (const segment of String(text || '').split(/(?<=[.!?])\s+|\n+/)) {
    for (const word of segment.trim().split(/\s+/).slice(1)) {
      const clean = word.replace(/[^A-Za-z]/g, '');
      if (/^[A-Z][a-z]{2,}$/.test(clean)) found.add(clean);
    }
  }
  return [...found];
}

/** Split the body into heading-delimited sections. Text before the first heading is dropped. */
function splitSections(text) {
  const sections = [];
  let current = null;
  for (const line of String(text || '').split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (looksLikeHeading(trimmed)) {
      if (current) sections.push(current);
      current = { heading: trimmed, body: '' };
    } else if (current) {
      current.body += ` ${trimmed}`;
    }
  }
  if (current) sections.push(current);
  return sections;
}

/**
 * Does this section say anything, or is it a heading with filler under it?
 *
 * A section counts only if it has a real body AND at least one specific — a
 * number, or a proper noun the heading did not already supply. This is the rule
 * that stops "OUTCOMES AND EVALUATION / We will evaluate the project to ensure
 * it is achieving its intended outcomes." from counting as a section.
 */
function isSubstantial(section) {
  const body = String(section?.body || '').trim();
  if (!body) return false;
  if (body.split(/\s+/).length < MIN_SECTION_WORDS) return false;

  // A number is a specific — "$75,000", "38%", "240 students".
  if (/\d/.test(body)) return true;

  // So is a named thing the heading did not already supply — "September",
  // "Riverbend", "the Calloway Foundation". Generic prose has neither.
  const headingWords = new Set(String(section?.heading || '').toLowerCase().split(/\s+/));
  return properNouns(body).some((noun) => !headingWords.has(noun.toLowerCase()));
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
 * It shares the bands with the ticket rubric so a score means the same thing on
 * both surfaces, but not the criteria: see ORDERLESS_CRITERIA for why alignment
 * is absent here.
 *
 * Two hard-won rules govern it:
 *
 * 1. Score the body, not the letterhead. Contact furniture is not content.
 * 2. A heading is not a section. Completeness counts sections that carry
 *    substance, not sections that merely exist.
 */
function heuristicScoreOrderless(html, style = 'proposal') {
  const full = plainTextLines(html);
  const body = stripLetterhead(full);
  const lower = body.toLowerCase();
  const fullLower = full.toLowerCase();
  const words = body ? body.split(/\s+/).length : 0;
  const isLetter = style === 'letter';

  const criteria = {};

  // Need — a specific, situated problem, or merely a stated one? Structure is
  // deliberately NOT rewarded here; completeness owns that.
  let need = 35;
  need += words > 250 ? 15 : Math.min(15, Math.floor(words / 20));
  need += hasNumbers(body) ? 20 : 0;
  need += /because|due to|as a result|without|urgent|gap|barrier/.test(lower) ? 15 : 0;
  need += /(in|across) (the )?[A-Z][a-z]+/.test(body) ? 10 : 0;
  criteria.need = clamp(need);

  // Completeness — substance-gated section coverage.
  const substantial = splitSections(body).filter(isSubstantial).length;
  const targetSections = isLetter ? 4 : 7;
  let completeness = 25;
  completeness += Math.min(45, substantial * (isLetter ? 8 : 5));
  completeness += substantial >= targetSections ? 20 : substantial * 3;
  criteria.completeness = clamp(completeness);

  // Evidence — proof points, read from the body only.
  let evidence = 30;
  evidence += /\bdata\b|evidence|measur|track record|partner|pilot|report|case study|testimonial/i.test(lower) ? 20 : 0;
  evidence += hasNumbers(body) ? 20 : 0;
  evidence += /\b(19|20)\d{2}\b/.test(body) ? 10 : 0;
  evidence += /baseline|assessment|survey|study|audit|evaluation/i.test(lower) ? 15 : 0;
  evidence += properNouns(body).length >= 2 ? 10 : 0;
  criteria.evidence = clamp(evidence);

  // Outcomes — measurable change.
  let outcomes = 35;
  outcomes += /%\s|percent|increase|reduce|by \d|\d+ (people|children|families|students|clients|participants)/i.test(body) ? 25 : 0;
  outcomes += /outcome|objective|goal|impact|evaluat/.test(lower) ? 20 : 0;
  outcomes += /baseline|target|milestone|kpi|indicator/.test(lower) ? 10 : 0;
  criteria.outcomes = clamp(outcomes);

  // Budget — a real money figure plus a breakdown, from the body.
  let budget = 30;
  budget += MONEY_IN_TEXT.test(body) ? 30 : 0;
  budget += /budget|allocat|cost|personnel|admin|line item|expense/.test(lower) ? 20 : 0;
  budget += /narrative|breakdown|justif/.test(lower) ? 10 : 0;
  criteria.budget = clamp(budget);

  // Compliance — the one criterion that is *supposed* to read the letterhead.
  let compliance = 35;
  compliance += /\b\d{1,5}\s+[A-Z][A-Za-z]+(\s+[A-Za-z]+)*\s+(street|st\.?|avenue|ave\.?|road|rd\.?|boulevard|blvd\.?|drive|dr\.?|lane|ln\.?|way|suite|ste\.?)\b/i.test(full) ? 15 : 0;
  compliance += /[^\s@]+@[^\s@]+\.[^\s@]{2,}/.test(full) ? 15 : 0;
  compliance += /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(full) ? 10 : 0;
  compliance += /deadline|due (date|by)|submission date|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(fullLower) ? 10 : 0;
  compliance += /sincerely|respectfully|signature|authorized|on behalf of/i.test(fullLower) ? 15 : 0;
  criteria.compliance = clamp(compliance);

  const { overall, missing, fixes, floorApplied } = finalizeOrderless(criteria, body, full, style);
  return {
    score: overall,
    criteria,
    strengths: buildStrengths(criteria),
    weaknesses: missing,
    missingComponents: missing,
    fixes,
    criteriaDefs: ORDERLESS_CRITERIA,
    evidenceFloorApplied: floorApplied,
    usedLLM: false,
    orderless: true,
  };
}

/**
 * Overall score plus gaps, derived entirely from the document.
 *
 * The ticket version of this (`finalize`) cannot be reused here: it reports
 * "organization address missing" and similar from ticket fields that an
 * uploaded draft was never asked to fill.
 *
 * @param {object} criteria per-criterion scores
 * @param {string} body     letterhead-stripped text, for content judgements
 * @param {string} full     the whole document, used only to describe the gap
 */
function finalizeOrderless(criteria, body, full, style = 'proposal') {
  const isLetter = style === 'letter';
  const total = ORDERLESS_CRITERIA.reduce(
    (sum, { key }) => sum + (criteria[key] || 0) * ORDERLESS_WEIGHTS[key],
    0,
  );
  const weightSum = ORDERLESS_CRITERIA.reduce((sum, { key }) => sum + ORDERLESS_WEIGHTS[key], 0);
  let overall = clamp(total / weightSum);

  // Hard floor. Formatting must never carry a draft past this line: a document
  // with nothing a reviewer can verify is not "funder-ready" however tidy it is.
  const floorApplied = (criteria.evidence || 0) < EVIDENCE_FLOOR;
  if (floorApplied) overall = Math.min(overall, EVIDENCE_FLOOR_CAP);

  const missing = [];
  const fixes = [];

  if (!hasNumbers(body)) {
    missing.push('No quantified data in the body of the document');
    fixes.push('Anchor the need with a local number — how many people, and how you know.');
  }
  if (!/%\s|percent|increase|reduce|by \d|\d+ (people|children|families|students|clients|participants)/i.test(body)) {
    missing.push('Outcomes are not quantified');
    fixes.push('Quantify at least one outcome (e.g. "serve 30 children" or "90% completion").');
  }
  if (!MONEY_IN_TEXT.test(body)) {
    missing.push('No budget figure found in the document');
    fixes.push('State the amount requested and tie it to the activities it funds.');
  }
  if (criteria.evidence < EVIDENCE_FLOOR) {
    missing.push('No documented evidence or track record');
    fixes.push('Add something a reviewer can verify — a result, partner, pilot, audit or report.');
  }

  const thin = splitSections(body).filter((section) => !isSubstantial(section));
  if (thin.length > 0) {
    const shown = thin.slice(0, 3).map((section) => section.heading).join('; ');
    missing.push(
      `${thin.length} section${thin.length === 1 ? '' : 's'} present as a heading with nothing under it`,
    );
    fixes.push(`Fill in: ${shown}. A heading alone does not count as a section.`);
  }

  if (floorApplied) {
    fixes.push(
      'The score is capped until the document carries evidence — reviewers fund proof, not structure.',
    );
  }
  if (isLetter && body.split(/\s+/).length < 180) {
    fixes.push('Expand the Statement of Need with local data and who is affected.');
  }

  return { overall, missing, fixes, floorApplied };
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
  const defs = orderless ? ORDERLESS_CRITERIA : CRITERIA;
  const criteriaKeys = defs.map((c) => `"${c.key}"`).join(', ');
  // Order-less gets line-preserved text (heading and letterhead detection need
  // the line breaks) with the letterhead removed, so the model does not count a
  // phone number as a proof point either. The signed-in path keeps the original
  // collapsed text, so its prompt is byte-for-byte what it was before.
  const fullText = orderless ? plainTextLines(html) : plainText(html);
  const body = orderless ? stripLetterhead(fullText) : fullText;
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
      ? 'This draft was uploaded directly, with no intake form and no funder, so do NOT score "alignment" and do NOT return that key.'
      : '',
    orderless
      ? 'Judge the body of the document, not its letterhead. A name, address, phone number, email or deadline is not evidence, and a section heading with no content under it is not a section.'
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
    body.slice(0, 12000),
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
  defs.forEach(({ key }) => {
    const value = Number(parsed.criteria[key]);
    criteria[key] = Number.isFinite(value) ? Math.max(1, Math.min(100, Math.round(value))) : 60;
  });

  const { overall, floorApplied } = orderless
    ? finalizeOrderless(criteria, body, fullText, style)
    : finalize(criteria, order, html, style);
  return {
    score: overall,
    criteria,
    criteriaDefs: defs,
    evidenceFloorApplied: orderless ? Boolean(floorApplied) : undefined,
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
  return {
    ...result,
    label: labelFor(result.score),
    style,
    criteriaDefs: result.criteriaDefs || (orderless ? ORDERLESS_CRITERIA : CRITERIA),
  };
}

module.exports = {
  CRITERIA,
  ORDERLESS_CRITERIA,
  ORDERLESS_WEIGHTS,
  EVIDENCE_FLOOR,
  EVIDENCE_FLOOR_CAP,
  scoreDraft,
  labelFor,
  heuristicScore,
  heuristicScoreOrderless,
  finalizeOrderless,
  detectStyle,
  stripLetterhead,
  splitSections,
  isSubstantial,
  plainTextLines,
};
