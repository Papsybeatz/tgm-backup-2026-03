/**
 * Steve — Order Ticket
 * ----------------------------------------------------------------------------
 * The "get food" concept applied to grants.
 *
 * A restaurant attendant does not guess your order and does not hand you a
 * generic burger. They take an ORDER, line by line, asking only for what is
 * still missing ("whip cream on that shake?", "for here or to go?"), then they
 * confirm it back, then they make it.
 *
 * This module is that order ticket for a grant. Steve's job is to fill every
 * required line on the ticket by talking. The ticket is the single source of
 * truth for what is still missing — the language model never decides whether
 * the order is complete. This is what guarantees the conversation always ends
 * in a finished grant instead of an endless chat.
 */

/** Canonical order lines, in the order an attendant would naturally ask them. */
const SLOTS = {
  applicant_name: {
    required: true,
    group: 'Who',
    label: 'Organization name',
    question: "What's the name of the organization this grant is for?",
    hint: 'The legal or commonly used name of the applicant organization.',
  },
  applicant_type: {
    required: true,
    group: 'Who',
    label: 'Applicant type',
    question:
      'What kind of organization is it — a registered 501(c)(3) nonprofit, a church, a school, a community group, or something else?',
    hint: 'e.g. 501(c)(3) nonprofit, church, school, community group, fiscal sponsor, individual, business.',
  },
  project_title: {
    required: false,
    group: 'What',
    label: 'Project title',
    question: 'What should we call this project or grant request?',
    hint: 'Short program/project name. If unknown, a title is derived automatically.',
  },
  need_statement: {
    required: true,
    group: 'What',
    label: 'Need / problem',
    question:
      'What problem are you solving, and why does it matter right now? Tell me the need in a few sentences.',
    hint: 'The core community problem, its urgency, and who is affected.',
  },
  program_activities: {
    required: true,
    group: 'What',
    label: 'What the money does',
    question: 'What will the funding actually pay for? Describe the activities or services.',
    hint: 'Concrete activities/services the grant funds (e.g. school fees, meals, dormitory, staff, transport).',
  },
  target_population: {
    required: true,
    group: 'Who',
    label: 'People served',
    question: 'Who exactly does this serve? Describe the people or community.',
    hint: 'The specific beneficiary group (e.g. orphans aged 4–15, single mothers, at-risk youth).',
  },
  people_served: {
    required: false,
    group: 'Who',
    label: 'Number served',
    question: 'How many people will this reach? A number is perfect.',
    hint: 'A number of beneficiaries reached by the funded program.',
  },
  service_area: {
    required: true,
    group: 'Where',
    label: 'Service area',
    question: 'What city, state, or region do you serve?',
    hint: 'Geographic area served (city, county, state, region, or country).',
  },
  address: {
    required: true,
    group: 'Where',
    label: 'Address',
    question: 'What is the organization’s mailing address? (Street, city, state, postal code.)',
    hint: 'Mailing/physical address of the applying organization — required for the proposal letterhead.',
  },
  funder_name: {
    required: false,
    group: 'Who',
    label: 'Funder',
    question:
      'Who is this grant going to? Name the funder or foundation — or say "general" if it’s a general request.',
    hint: 'The funder/foundation being asked. Defaults to a general, unnamed funder.',
  },
  funder_guidelines: {
    required: false,
    group: 'Who',
    label: 'Funder guidelines',
    question:
      'Do you have the funder’s guidelines or priorities? Paste them, or say skip and I’ll write to standard reviewer expectations.',
    hint: 'Pasted funder guidelines, priorities, eligibility rules, or rubric.',
  },
  request_amount: {
    required: true,
    group: 'How much',
    label: 'Amount requested',
    question: 'How much are you requesting?',
    hint: 'The grant amount requested, with currency (e.g. 75000 USD).',
  },
  budget_breakdown: {
    required: false,
    group: 'How much',
    label: 'Budget breakdown',
    question:
      'Do you have a budget breakdown? Give me the main lines and amounts, or say skip and I’ll build a proportional one.',
    hint: 'Budget line items and amounts. If skipped, a proportional budget is built from the amount and activities.',
  },
  timeline: {
    required: false,
    group: 'When',
    label: 'Timeline',
    question: 'When would the funded work start and finish?',
    hint: 'Program start/end dates or duration (e.g. Jan–Dec 2027).',
  },
  outcomes: {
    required: true,
    group: 'When',
    label: 'Measurable outcomes',
    question:
      'What measurable change should happen? Give me the outcomes you want the funder to hold you to.',
    hint: 'Measurable outcomes/goals (numbers, percentages, counts).',
  },
  evidence: {
    required: false,
    group: 'Proof',
    label: 'Proof points',
    question:
      'Any proof points I should use — results so far, partners, testimonials, or history? Or say skip.',
    hint: 'Prior results, track record, partners, testimonials, awards.',
  },
  contact_name: {
    required: false,
    group: 'Sign-off',
    label: 'Signatory',
    question: 'Who signs off on this proposal, and what email should the funder reply to?',
    hint: 'Name and contact email of the person submitting the proposal.',
  },
  deadline: {
    required: false,
    group: 'Sign-off',
    label: 'Deadline',
    question: 'When is the application due? (Or say none.)',
    hint: 'Submission deadline, if any.',
  },
  style: {
    required: false,
    group: 'Sign-off',
    label: 'Deliverable style',
    question: 'Should Steve write a full proposal or a one-page grant letter?',
    hint: 'Deliverable style: "full_proposal" or "letter". Defaults to full_proposal.',
  },
};

/** The canonical ask order — the sequence an attendant works down the ticket. */
const ASK_ORDER = [
  'applicant_name',
  'applicant_type',
  'need_statement',
  'program_activities',
  'target_population',
  'people_served',
  'service_area',
  'address',
  'request_amount',
  'outcomes',
  'timeline',
  'funder_name',
  'funder_guidelines',
  'budget_breakdown',
  'evidence',
  'contact_name',
  'deadline',
  'style',
];

const REQUIRED_SLOTS = Object.keys(SLOTS).filter((key) => SLOTS[key].required);

const STYLE_VALUES = ['full_proposal', 'letter'];

function isBlank(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function cleanValue(key, value) {
  if (isBlank(value)) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (!text) return null;
  if (text.length > 4000) return text.slice(0, 4000).trim();
  return text;
}

/**
 * Merge an extracted patch into the order. Never lets an empty value wipe a
 * line the applicant already gave us — an attendant doesn't forget your order.
 */
function mergeOrder(order, patch) {
  const next = { ...(order || {}) };
  if (!patch || typeof patch !== 'object') return next;
  Object.keys(patch).forEach((rawKey) => {
    const key = String(rawKey).trim();
    if (!SLOTS[key]) return;
    const value = cleanValue(key, patch[key]);
    if (value === null) return;
    if (key === 'style') {
      const normalized = String(value).toLowerCase().replace(/\s+/g, '_');
      next.style = STYLE_VALUES.includes(normalized) ? normalized : 'full_proposal';
      return;
    }
    next[key] = value;
  });
  if (!next.style) next.style = 'full_proposal';
  return next;
}

/** Lines still blank on the ticket that we genuinely cannot write without. */
function missingRequired(order) {
  return REQUIRED_SLOTS.filter((key) => isBlank(order?.[key]));
}

/** Optional lines we could still ask for (used by "anything else?" follow-ups). */
function missingOptional(order) {
  return ASK_ORDER.filter((key) => !SLOTS[key].required && isBlank(order?.[key]));
}

function isComplete(order) {
  return missingRequired(order).length === 0;
}

/**
 * The next question to ask, one line at a time — exactly like "whip cream on
 * that shake?". Required lines come first, in ask order. Once required lines
 * are filled, up to `optionalBudget` optional lines are offered.
 */
function nextQuestion(order, optionalBudget = 2) {
  const missing = missingRequired(order);
  if (missing.length > 0) {
    const key = ASK_ORDER.find((slot) => missing.includes(slot)) || missing[0];
    return { key, ...SLOTS[key], optional: false };
  }
  const optional = missingOptional(order);
  if (optional.length > 0 && optionalBudget > 0) {
    const key = ASK_ORDER.find((slot) => optional.includes(slot));
    return { key, ...SLOTS[key], optional: true };
  }
  return null;
}

function titleCase(text) {
  return String(text || '')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** A sensible title when the applicant didn't name the project. */
function deriveTitle(order) {
  if (!isBlank(order?.project_title)) return String(order.project_title).trim();
  const audience = !isBlank(order?.target_population)
    ? String(order.target_population).trim().split(/[,.]/)[0]
    : null;
  const area = !isBlank(order?.service_area) ? String(order.service_area).trim().split(',')[0] : null;
  const base = audience ? titleCase(audience) : 'Community';
  const suffix = area ? ` in ${titleCase(area)}` : '';
  return `${titleCase(base)} Support Program${suffix}`.replace(/\s+/g, ' ').trim();
}

/**
 * Normalizes the money value to a plain number of major units, but ONLY when
 * the string actually looks like money. An address such as "4210 Electric Road"
 * must never be silently read as a $4,210 request.
 */
function parseAmount(value) {
  if (isBlank(value)) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const text = String(value).trim().toLowerCase();
  const hasCurrencyCue = /[$€£]|\b(usd|eur|gbp|dollars?|bucks)\b/.test(text);

  const bare = text.replace(/[$€£,\s]/g, '');
  const match = bare.match(/^(\d+(?:\.\d+)?)(k|m|million|thousand)?(usd|eur|gbp|dollars?)?$/);

  // A clean bare number (e.g. "75000", "75k") is accepted.
  if (match) return scale(Number(match[1]), match[2]);

  // Otherwise only accept it when an explicit currency cue is present.
  if (hasCurrencyCue) {
    const embedded = text.replace(/[,\s]/g, '').match(/(\d+(?:\.\d+)?)(k|m|million|thousand)?/);
    if (embedded) return scale(Number(embedded[1]), embedded[2]);
  }

  return null;
}

function scale(amount, suffix) {
  if (!Number.isFinite(amount)) return null;
  if (suffix === 'k' || suffix === 'thousand') return amount * 1000;
  if (suffix === 'm' || suffix === 'million') return amount * 1000000;
  return amount;
}

function formatAmount(value) {
  const amount = parseAmount(value);
  if (amount === null) return String(value || '').trim();
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `$${amount.toLocaleString('en-US')}`;
  }
}

/**
 * A read-back of the order, the same way an attendant repeats your order before
 * charging you. Shown to the applicant before Steve writes.
 */
function summarizeOrder(order) {
  return REQUIRED_SLOTS.filter((key) => !isBlank(order?.[key])).map((key) => {
    const value = key === 'request_amount' ? formatAmount(order[key]) : order[key];
    return `• ${SLOTS[key].label}: ${value}`;
  });
}

/** A compact view of the ticket for progress UI. */
function orderProgress(order) {
  const lines = ASK_ORDER.map((key) => ({
    key,
    label: SLOTS[key].label,
    required: Boolean(SLOTS[key].required),
    filled: !isBlank(order?.[key]),
  }));
  const requiredFilled = REQUIRED_SLOTS.filter((key) => !isBlank(order?.[key])).length;
  return {
    lines,
    requiredTotal: REQUIRED_SLOTS.length,
    requiredFilled,
    percent: Math.round((requiredFilled / REQUIRED_SLOTS.length) * 100),
    complete: requiredFilled === REQUIRED_SLOTS.length,
  };
}

/** Validates the order before writing. Returns blocking problems, if any. */
function validateOrder(order) {
  const blockers = [];

  if (!isBlank(order?.request_amount)) {
    const amount = parseAmount(order.request_amount);
    if (amount === null) {
      blockers.push('I could not read the requested amount as money — please give it as a number, e.g. 75000 or $75,000.');
    } else if (amount <= 0) {
      blockers.push('The requested amount looks like zero.');
    }
  }

  const served = order?.people_served;
  if (!isBlank(served) && !/\d/.test(String(served))) {
    blockers.push('The number served should include a number.');
  }

  return blockers;
}

module.exports = {
  SLOTS,
  ASK_ORDER,
  REQUIRED_SLOTS,
  STYLE_VALUES,
  isBlank,
  mergeOrder,
  missingRequired,
  missingOptional,
  isComplete,
  nextQuestion,
  deriveTitle,
  parseAmount,
  formatAmount,
  summarizeOrder,
  orderProgress,
  validateOrder,
};
