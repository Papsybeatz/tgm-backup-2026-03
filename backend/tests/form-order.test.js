/**
 * Itemized intake form → order ticket.
 *
 * Run:  cd backend && node --test tests/form-order.test.js
 *
 * These tests exercise the form bridge with no database and no LLM key, so they
 * prove the deterministic path: a completed form produces a full letter with
 * ZERO model calls.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@127.0.0.1:1/test';
process.env.DIRECT_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;

const {
  buildOrderFromForm,
  resolveApplicantType,
  resolveContactName,
  normalizeDeliverable,
} = require('../agents/steve/formOrder');
const { missingRequired, isComplete, parseAmount } = require('../agents/steve/order');
const { generateGrant } = require('../agents/steve/drafting');

const FULL_FORM = {
  orgName: 'Hope Orphanage',
  orgType: 'school',
  address: '4210 Electric Road #1038, Roanoke, VA 24018',
  phone: '(540) 555-0142',
  contactName: 'Grace Mensah, Director',
  contactEmail: 'grace@hopeorphanage.org',
  projectTitle: 'Hope Residential Support Program',
  need: 'Thirty orphaned children aged 4 to 15 lack stable housing and school access.',
  servesWho: 'Orphaned children aged 4 to 15',
  peopleServed: '30',
  serviceArea: 'Roanoke, Virginia',
  amount: '75000',
  moneyDoes: 'Fund school fees, two daily meals, and a supervised dormitory.',
  outcomes: 'Serve 30 children with 95% school enrollment and 100% daily meal coverage.',
  funderName: 'The Community Foundation',
  deadline: 'March 15',
  deliverable: 'letter',
};

test('a complete form maps onto the order ticket', () => {
  const order = buildOrderFromForm(FULL_FORM);
  assert.equal(order.applicant_name, 'Hope Orphanage');
  assert.equal(order.applicant_type, 'school');
  assert.equal(order.project_title, 'Hope Residential Support Program');
  assert.equal(order.service_area, 'Roanoke, Virginia');
  assert.equal(order.people_served, '30');
  assert.equal(Number(parseAmount(order.request_amount)), 75000);
  assert.equal(order.style, 'letter');
  assert.equal(order.contact_name, 'Grace Mensah, Director (grace@hopeorphanage.org)');
  assert.equal(order.phone, '(540) 555-0142');
  assert.equal(isComplete(order), true, 'every required line must be filled');
});

test('a dropdown can never mis-file the applicant type', () => {
  assert.equal(resolveApplicantType({ orgType: 'church' }), 'church');
  assert.equal(resolveApplicantType({ orgType: 'other', otherType: 'Fiscal sponsor' }), 'Fiscal sponsor');
  assert.equal(resolveApplicantType({ orgType: 'other' }), 'community-based organization');
  // The old conversational bug: "I already said it's a school". A dropdown makes it impossible.
  assert.equal(buildOrderFromForm({ ...FULL_FORM, orgType: 'school' }).applicant_type, 'school');
});

test('contact name and email fold into the single signatory line', () => {
  assert.equal(resolveContactName({ contactName: 'Jane Doe' }), 'Jane Doe');
  assert.equal(resolveContactName({ contactEmail: 'jane@x.org' }), 'jane@x.org');
  assert.equal(resolveContactName({ contactName: 'Jane Doe', contactEmail: 'jane@x.org' }), 'Jane Doe (jane@x.org)');
  assert.equal(resolveContactName({}), '');
});

test('the deliverable toggle defaults to a one-page letter', () => {
  assert.equal(normalizeDeliverable('letter'), 'letter');
  assert.equal(normalizeDeliverable('full_proposal'), 'full_proposal');
  assert.equal(normalizeDeliverable('proposal'), 'full_proposal');
  assert.equal(normalizeDeliverable(''), 'letter');
  assert.equal(buildOrderFromForm({ ...FULL_FORM, deliverable: undefined }).style, 'letter');
  assert.equal(buildOrderFromForm({ ...FULL_FORM, deliverable: 'full_proposal' }).style, 'full_proposal');
});

test('an empty form reports exactly the required lines', () => {
  const order = buildOrderFromForm({});
  const missing = missingRequired(order);
  assert.ok(missing.includes('applicant_name'));
  assert.ok(missing.includes('applicant_type'));
  assert.ok(missing.includes('need_statement'));
  assert.ok(missing.includes('program_activities'));
  assert.ok(missing.includes('target_population'));
  assert.ok(missing.includes('service_area'));
  assert.ok(missing.includes('address'));
  assert.ok(missing.includes('request_amount'));
  assert.ok(missing.includes('outcomes'));
  assert.equal(isComplete(order), false);
});

test('a completed form produces a full letter with ZERO LLM calls', async () => {
  delete process.env.OPENAI_API_KEY;
  delete process.env.GROQ_API_KEY;

  const order = buildOrderFromForm(FULL_FORM);
  const draft = await generateGrant(order, { style: 'letter' });

  assert.equal(draft.usedLLM, false, 'no key configured — the assembler must be deterministic');
  assert.equal(draft.style, 'letter');
  assert.ok(draft.html.includes('Hope Orphanage'));
  assert.ok(draft.html.includes('$75,000'));
  assert.ok(draft.html.includes('Grace Mensah, Director (grace@hopeorphanage.org)'));
  assert.ok(draft.html.includes('(540) 555-0142'), 'the phone must reach the sign-off');
  // A letter is exactly the five letter sections, not the proposal shape.
  assert.deepEqual(Object.keys(draft.sections), [
    'Opening',
    'Statement of Need',
    'Project Description',
    'Budget Request',
    'Conclusion',
  ]);
});
