/**
 * Steve — amendments
 * ----------------------------------------------------------------------------
 * Correcting an order is not the same as placing one.
 *
 * A real attendant never ignores "actually, make it a large". Once a line is on
 * the ticket, the applicant must be able to change it — and that has to work
 * whether or not the LLM is available, because the ticket is the source of
 * truth and the planner is what runs when the model is down.
 *
 * This module parses corrections deterministically:
 *   "change the amount to $250k"      -> request_amount = 250000
 *   "update the address to 12 Main St" -> address = "12 Main St"
 *   "actually the name is Hope Academy" -> applicant_name = "Hope Academy"
 *   "make it $250k"                    -> request_amount = 250000
 */
const { SLOTS, isBlank, parseAmount } = require('./order');

/**
 * Slot aliases, ordered by specificity. The earliest match in the message wins;
 * ties break by this declaration order (more specific first).
 */
const SLOT_ALIASES = [
  { key: 'request_amount', patterns: [/\bamount\s+requested\b/, /\brequested\s+amount\b/, /\bhow much\b/, /\bamount\b/, /\bbudget\b/, /\bfunding\b/, /\bmoney\b/, /\bsum\b/] },
  { key: 'service_area', patterns: [/\bservice\s+area\b/, /\barea\s+(?:we|i)\s+serve\b/, /\bregion\b/, /\bcity\b/, /\bstate\b/, /\bwhere\s+(?:we|i|they)\s+(?:serve|operate|work)\b/] },
  { key: 'address', patterns: [/\bmailing\s+address\b/, /\baddress\b/, /\bpostal\b/, /\bhead\s*office\b/, /\boffice\s+location\b/] },
  { key: 'people_served', patterns: [/\bnumber\s+served\b/, /\bpeople\s+served\b/, /\bhow\s+many\b/, /\bbeneficiaries\b/, /\bcount\b/] },
  { key: 'applicant_name', patterns: [/\b(?:organization|organisation|org)\s+name\b/, /\bname\s+of\s+the\s+(?:org|organization|organisation)\b/, /\bcalled\b/, /\bname\b/] },
  { key: 'applicant_type', patterns: [/\bapplicant\s+type\b/, /\btype\s+of\s+(?:org|organization|organisation)\b/, /\bkind\s+of\s+(?:org|organization|organisation)\b/] },
  { key: 'project_title', patterns: [/\bproject\s+title\b/, /\b(?:program|project)\s+name\b/, /\btitle\b/] },
  { key: 'funder_name', patterns: [/\bfunder\b/, /\bfoundation\b/, /\bdonor\b/, /\bgrantor\b/] },
  { key: 'outcomes', patterns: [/\boutcomes?\b/, /\bimpact\b/, /\bresults?\b/, /\bgoals?\b/] },
  { key: 'timeline', patterns: [/\btimeline\b/, /\bduration\b/, /\bperiod\b/] },
  { key: 'deadline', patterns: [/\bdeadline\b/, /\bdue\s+date\b/] },
  { key: 'contact_name', patterns: [/\bcontact\b/, /\bsignatory\b/, /\bsign\s*-?\s*off\b/] },
  { key: 'need_statement', patterns: [/\bneed\s+statement\b/, /\bthe\s+need\b/, /\bproblem\b/] },
  { key: 'program_activities', patterns: [/\bactivities\b/, /\bwhat\s+the\s+money\b/, /\bprogram\s+description\b/] },
  { key: 'target_population', patterns: [/\bpeople\s+served\b/, /\bpopulation\b/, /\bbeneficiaries\b/] },
  { key: 'evidence', patterns: [/\bevidence\b/, /\bproof\b/, /\btrack\s+record\b/] },
  { key: 'style', patterns: [/\bstyle\b/, /\bfull\s+proposal\b/, /\bproposal\b/, /\bletter\b/, /\bone\s*-?\s*page\s+(?:grant\s+)?letter\b/] },
];

const CORRECTION_VERB = /\b(change|update|set|amend|edit|correct|revise|adjust|actually|instead|make\s+it|turn|convert|should\s+be)\b/i;
const ASSIGNMENT = /\b(?:to|into|is|as|=|:)\s+(.+)$/i;
const SKIP_VALUE = /^(skip|none|no|n\/a|nothing|never\s*mind)$/i;

/** Slots that should hold a short value — a paragraph here is almost certainly a story. */
const SHORT_SLOTS = new Set([
  'applicant_name',
  'applicant_type',
  'request_amount',
  'people_served',
  'service_area',
  'address',
  'deadline',
  'contact_name',
  'style',
  'project_title',
  'timeline',
  'funder_name',
]);

/** Does this look like prose rather than a value for a short field? */
function looksLikeProse(value) {
  const text = String(value || '').trim();
  if (!text) return false;
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words > 14) return true;
  if (text.length > 110) return true;
  // Two or more sentences is a description, not a name or an address.
  const sentences = text.split(/[.!?]\s+/).filter((s) => s.trim().length > 0).length;
  return sentences >= 3;
}

/** Find the slot the applicant is referring to, preferring the earliest mention. */
function findTargetSlot(message) {
  const text = String(message || '').toLowerCase();
  let best = null;
  SLOT_ALIASES.forEach((entry, priority) => {
    entry.patterns.forEach((pattern) => {
      const match = text.match(pattern);
      if (!match || match.index === undefined) return;
      const index = match.index;
      if (!best || index < best.index || (index === best.index && priority < best.priority)) {
        best = { key: entry.key, index, priority };
      }
    });
  });
  return best;
}

function cleanValue(raw) {
  return String(raw || '')
    .trim()
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .replace(/[.。]+$/, '')
    .trim();
}

/**
 * Parse a correction out of a message.
 * @returns {{key: string, value: string|number, label: string}|null}
 */
function parseAmendment(message, order = {}) {
  const text = String(message || '').trim();
  if (!text) return null;

  const hasVerb = CORRECTION_VERB.test(text);
  const target = findTargetSlot(text);

  // "make it $250k" — no slot named, but a money value with the amount already on the ticket.
  if (hasVerb && !target) {
    const money = text.match(/\$\s*[\d,]+(?:\.\d+)?\s*[kKmM]?|\b[\d,]+\s*[kKmM]\b/);
    if (money && !isBlank(order.request_amount)) {
      const parsed = parseAmount(money[0]);
      if (parsed !== null && parsed > 0) {
        return { key: 'request_amount', value: parsed, label: SLOTS.request_amount.label };
      }
    }
    return null;
  }

  if (!target) return null;

  // Style is chosen by naming the artifact ("make it a full proposal"), not by
  // an "X to Y" assignment, so it cannot go through the generic value parser.
  if (target.key === 'style') {
    const wants =
      /\b(letter of inquiry|letter)\b/i.test(text) ? 'letter'
        : /\b(full\s+proposal|full\s+application|proposal)\b/i.test(text) ? 'full_proposal'
          : null;
    if (!wants) return null;
    // 'letter' and 'proposal' are weak words that appear in ordinary requests
    // — e.g. "he needs a grant letter to apply for support" is not a change
    // request. Style therefore requires a strong verb expressing intent, and
    // not merely the presence of the word.
    const STRONG_VERB = /\b(change|update|set|amend|edit|correct|revise|adjust|make\s+it|turn|convert|switch|prefer|want|give\s+me)\b/i;
    return STRONG_VERB.test(text) ? { key: 'style', value: wants, label: SLOTS.style.label } : null;
  }

  // A correction needs either an explicit verb ("change the amount to X") or an
  // explicit assignment ("the amount is X"). Otherwise it is just conversation.
  const afterAlias = text.slice(target.index);
  const assignment = afterAlias.match(ASSIGNMENT);
  if (!hasVerb && !assignment) return null;

  let rawValue = assignment ? assignment[1] : null;
  if (!rawValue) {
    // Verb with no connector: take whatever follows the slot reference.
    const slotWord = afterAlias.match(/^[a-z\s]+/i);
    rawValue = afterAlias.slice(slotWord ? slotWord[0].length : 0);
  }

  const value = cleanValue(rawValue);
  if (!value || SKIP_VALUE.test(value)) return null;

  if (target.key === 'request_amount') {
    const parsed = parseAmount(value);
    if (parsed === null || parsed <= 0) return null;
    return { key: target.key, value: parsed, label: SLOTS[target.key].label };
  }

  return { key: target.key, value, label: SLOTS[target.key].label };
}

module.exports = { parseAmendment, findTargetSlot, looksLikeProse, SHORT_SLOTS };
