/**
 * Steve — itemized intake form → order ticket
 * ----------------------------------------------------------------------------
 * The conversational intake costs 12–15 LLM calls per grant: every turn asks
 * for one line, re-sends the transcript, and can still mis-file a fact ("I
 * already said it's a school"). The form is the deterministic front door.
 *
 * This module is the ONLY bridge between the form's field ids and the canonical
 * order ticket in `order.js`. The fields exist to make the ticket easy to fill;
 * the ticket remains the single source of truth that drives `drafting.js`. That
 * means a completed form produces a full letter with no conversational calls at
 * all, and the applicant type is a dropdown rather than something to parse.
 *
 * Field ids are deliberately transport-level (orgName, need, …). Everything
 * here is pure: no LLM, no database, no clock.
 */
const { mergeOrder } = require('./order');

/** The dropdown value that means "none of the above". */
const OTHER_TYPE = 'other';
const OTHER_TYPE_FALLBACK = 'community-based organization';

/** Values the deliverable toggle can carry. */
const DELIVERABLE = {
  letter: 'letter',
  full_proposal: 'full_proposal',
};

function str(form, key) {
  const value = form?.[key];
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeDeliverable(value) {
  const text = String(value || '').toLowerCase().replace(/[\s-]+/g, '_');
  return text === DELIVERABLE.full_proposal || text === 'proposal' || text === 'full'
    ? DELIVERABLE.full_proposal
    : DELIVERABLE.letter;
}

function resolveApplicantType(form) {
  const selected = str(form, 'orgType');
  if (selected.toLowerCase() === OTHER_TYPE) {
    return str(form, 'otherType') || OTHER_TYPE_FALLBACK;
  }
  return selected;
}

/** Fold the separate name/email inputs into the single signatory line. */
function resolveContactName(form) {
  const name = str(form, 'contactName');
  const email = str(form, 'contactEmail');
  if (name && email) return `${name} (${email})`;
  return name || email;
}

/**
 * Turn the form payload into a validated order ticket.
 *
 * `mergeOrder` is reused rather than re-implemented so the form obeys exactly
 * the same rules as the conversation: unknown keys are ignored, blanks never
 * wipe a value, and `style` is normalised. Unknown/blank fields simply don't
 * appear on the ticket.
 *
 * @param {object} form  Field ids from the intake screen.
 * @returns {object}     A canonical order ticket.
 */
function buildOrderFromForm(form = {}) {
  const raw = {
    applicant_name: str(form, 'orgName'),
    applicant_type: resolveApplicantType(form),
    project_title: str(form, 'projectTitle'),
    need_statement: str(form, 'need'),
    program_activities: str(form, 'moneyDoes'),
    target_population: str(form, 'servesWho'),
    people_served: str(form, 'peopleServed'),
    service_area: str(form, 'serviceArea'),
    address: str(form, 'address'),
    request_amount: str(form, 'amount'),
    outcomes: str(form, 'outcomes'),
    funder_name: str(form, 'funderName'),
    funder_guidelines: str(form, 'funderGuidelines'),
    deadline: str(form, 'deadline'),
    contact_name: resolveContactName(form),
    phone: str(form, 'phone'),
    evidence: str(form, 'evidence'),
    timeline: str(form, 'timeline'),
    style: normalizeDeliverable(str(form, 'deliverable')),
  };

  const order = mergeOrder({}, raw);
  // mergeOrder always leaves a style; keep the contract explicit anyway.
  if (!order.style) order.style = DELIVERABLE.letter;
  return order;
}

module.exports = {
  buildOrderFromForm,
  resolveApplicantType,
  resolveContactName,
  normalizeDeliverable,
  OTHER_TYPE,
  OTHER_TYPE_FALLBACK,
  DELIVERABLE,
};
