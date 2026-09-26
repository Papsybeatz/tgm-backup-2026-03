/**
 * Steve — deterministic fact extraction
 * ----------------------------------------------------------------------------
 * The intake model sometimes acknowledges a detail in its reply ("thanks for
 * sharing that the orphanage serves 30 children") without filing it on the
 * ticket. That is the worst kind of failure: the applicant was told the detail
 * was understood, so they never mention it again, and the grant goes out
 * without it.
 *
 * This module guarantees the common, unambiguous facts land on the ticket
 * regardless of what the model does. It is deliberately conservative — it only
 * fires on patterns that cannot reasonably mean anything else. The model still
 * handles everything subtle; this is a floor, not a ceiling.
 */
const { SLOTS, isBlank, parseAmount } = require('./order');

/** "30 orphans", "120 families", "45 street kids", "500 people" */
const BENEFICIARY_NOUNS =
  'orphans?|children|kids|child|families|family|people|persons|students|pupils|youths?|young people|women|men|girls|boys|seniors|elderly|veterans|refugees|immigrants|beneficiaries|participants|residents|patients|clients|learners|athletes|players|widows|single mothers';

const COUNT_PATTERN = new RegExp(
  `\\b(\\d[\\d,]{0,7})\\s+(?:[a-z][a-z-]*\\s+){0,3}(${BENEFICIARY_NOUNS})\\b`,
  'i',
);

/** Only money that is unmistakably money — never a street number. */
const MONEY_PATTERN = /(?:[$€£]\s?[\d,]+(?:\.\d+)?\s*(?:k|m|million|thousand)?|\b[\d,]+\s*(?:usd|dollars?)\b)/i;

const TYPE_PATTERNS = [
  { pattern: /501\s*\(?c\)?\s*\(?3\)?|non-?profit|not-for-profit|charity|charitable/i, value: '501(c)(3) nonprofit' },
  { pattern: /\bchurch\b|\bministry\b|\bparish\b|\bcongregation\b/i, value: 'Church' },
  { pattern: /\bpublic school\b|\bhigh school\b|\bprimary school\b|\belementary\b/i, value: 'School' },
];

/** A count with no noun ("how many? 30") is only usable once a population is known. */
function extractBeneficiaries(message) {
  const match = String(message).match(COUNT_PATTERN);
  if (!match) return {};
  const count = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(count) || count <= 0 || count > 10_000_000) return {};
  const noun = match[2].toLowerCase().trim();
  return { people_served: count, target_population: noun };
}

/**
 * @returns {object} a partial order, safe to pass straight to mergeOrder
 */
function extractDeterministic(message) {
  const text = String(message || '');
  if (!text.trim()) return {};

  const out = {};

  const beneficiaries = extractBeneficiaries(text);
  if (!isBlank(beneficiaries.people_served)) Object.assign(out, beneficiaries);

  const money = text.match(MONEY_PATTERN);
  if (money) {
    const parsed = parseAmount(money[0]);
    // parseAmount is strict, so an address can never be read as an amount.
    if (parsed !== null && parsed > 0) out.request_amount = parsed;
  }

  for (const { pattern, value } of TYPE_PATTERNS) {
    if (pattern.test(text)) {
      out.applicant_type = value;
      break;
    }
  }

  // Remove anything the order does not understand, so callers cannot be misled.
  Object.keys(out).forEach((key) => {
    if (!SLOTS[key]) delete out[key];
  });

  return out;
}

module.exports = { extractDeterministic, extractBeneficiaries };
