/**
 * Funder persistence.
 *
 * Two bugs compounded here, and either one alone was enough to lose a funder:
 *
 *   1. FunderLead / FunderCycle existed only in the legacy root
 *      prisma/schema.prisma, while package.json points `prisma generate` at
 *      backend/prisma/schema.prisma. The generated client had no
 *      prisma.funderLead, so all 15 call sites threw at runtime.
 *   2. The public intake caught that throw, substituted a fake lead
 *      ({ id: 'no-db' }), and returned 200 "pending_review" — so the applicant
 *      was told their application was received, got a confirmation email, and
 *      the lead was discarded. The team never saw it.
 *
 * These tests pin both halves: the client can address the tables, the tables are
 * created by the mechanism that actually runs, and a failed write can no longer
 * be reported as a success.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const SCHEMA_SRC = read('backend/prisma/schema.prisma');
const ENSURE_SRC = read('backend/utils/ensureSchema.js');
const INTAKE_SRC = read('backend/routes/funderApiRequest.js');

const { STATEMENTS } = require('../utils/ensureSchema');
const { PrismaClient } = require('@prisma/client');

// ── The schema the client is generated from actually has the models ──────────

test('the schema behind prisma generate defines FunderLead and FunderCycle', () => {
  assert.match(SCHEMA_SRC, /^model FunderLead \{/m);
  assert.match(SCHEMA_SRC, /^model FunderCycle \{/m);
});

test('the generated Prisma client can address both funder tables', () => {
  // This is the assertion that fails loudly if the models are ever moved back
  // into a schema the generator does not read.
  const prisma = new PrismaClient();
  try {
    assert.equal(typeof prisma.funderLead, 'object');
    assert.equal(typeof prisma.funderCycle, 'object');
    for (const method of ['findFirst', 'findUnique', 'create', 'update', 'count']) {
      assert.equal(typeof prisma.funderLead[method], 'function', `funderLead.${method} missing`);
    }
  } finally {
    prisma.$disconnect().catch(() => {});
  }
});

test('the funder models carry every field the routes write', () => {
  for (const field of [
    'orgName', 'planRequested', 'riskScore', 'riskReasons', 'sidecarFunderId', 'orgApiKey',
  ]) {
    assert.match(SCHEMA_SRC, new RegExp(`^\\s+${field}\\s`, 'm'), `FunderLead.${field} missing`);
  }
  for (const field of [
    'funderLeadId', 'planKey', 'stripeCheckoutSessionId', 'sidecarCycleId',
    'applicationsAllowed', 'applicationsUsed',
  ]) {
    assert.match(SCHEMA_SRC, new RegExp(`^\\s+${field}\\s`, 'm'), `FunderCycle.${field} missing`);
  }
});

test('funder status is a String, matching the parachute TEXT columns', () => {
  // A Postgres enum here would disagree with the CREATE TABLE ... TEXT that
  // ensureSchema.js issues, and the two mechanisms would fight.
  assert.doesNotMatch(SCHEMA_SRC, /^enum FunderLeadStatus/m);
  assert.doesNotMatch(SCHEMA_SRC, /^enum FunderCycleStatus/m);
});

// ── The parachute creates the tables, and is actually reached ────────────────

test('ensureSchema creates both funder tables', () => {
  const labels = STATEMENTS.map((s) => s.label);
  for (const label of [
    'FunderLead table',
    'FunderLead email index',
    'FunderLead status index',
    'FunderCycle table',
    'FunderCycle unique index',
    'FunderCycle status index',
  ]) {
    assert.ok(labels.includes(label), `missing statement: ${label}`);
  }
});

test('the funder tables are created with IF NOT EXISTS so boot stays idempotent', () => {
  const funder = STATEMENTS.filter((s) => /Funder/i.test(s.label));
  assert.ok(funder.length >= 6);
  for (const { label, sql } of funder) {
    assert.match(sql, /IF NOT EXISTS/, `${label} is not idempotent`);
  }
});

test('FunderCycle declares its foreign key to FunderLead', () => {
  const create = STATEMENTS.find((s) => s.label === 'FunderCycle table');
  assert.match(create.sql, /FOREIGN KEY \("funderLeadId"\)/);
  assert.match(create.sql, /REFERENCES "FunderLead"\("id"\)/);
});

test('the Testimonial statements are inside STATEMENTS, not after the return', () => {
  // Regression: this block used to sit after `return`, so on any database
  // without the table, quotes could never have been collected.
  const labels = STATEMENTS.map((s) => s.label);
  assert.ok(labels.includes('Testimonial table'));
  assert.ok(labels.includes('Testimonial status index'));
});

test('ensureSchema performs no database work after it returns', () => {
  // The precise shape of the dead-code bug: a statement that can never run.
  const returnIdx = ENSURE_SRC.indexOf('return { ok: verify.ok');
  const lastExecIdx = ENSURE_SRC.lastIndexOf('$executeRawUnsafe');
  assert.ok(returnIdx > -1, 'ensureSchema return not found');
  assert.ok(
    lastExecIdx < returnIdx,
    'a $executeRawUnsafe call sits after the return and can never run',
  );
});

// ── A failed write can no longer be reported as a success ────────────────────

test('the intake does not substitute a fake lead when the write fails', () => {
  // Match the assignment, not the word: the comment above the catch explains
  // what the old code did, and a bare /no-db/ check mistakes that explanation
  // for the code it is describing.
  assert.doesNotMatch(
    INTAKE_SRC,
    /lead\s*=\s*\{\s*id:/,
    'a literal placeholder lead is still assigned on the failure path',
  );
  assert.doesNotMatch(INTAKE_SRC, /Graceful degradation: continue without Prisma/);
});

test('the intake returns a real error when the lead cannot be persisted', () => {
  assert.match(INTAKE_SRC, /reason: 'lead_persistence_failed'/);
  assert.match(INTAKE_SRC, /res\.status\(503\)/);
});

test('the intake still returns its success only after a successful write', () => {
  // The success response must come after the create, not from the catch.
  const catchIdx = INTAKE_SRC.indexOf('Could not persist lead');
  const successIdx = INTAKE_SRC.indexOf("status: 'pending_review'");
  assert.ok(catchIdx > -1, 'persistence failure is not handled');
  assert.ok(successIdx > catchIdx, 'success response is reachable before the write');
});

test('the intake no longer claims a lead was created on the failure path', () => {
  // 'Lead created' is logged after the try/catch, so it now only runs on success.
  const logIdx = INTAKE_SRC.indexOf("'[FUNDER-API REQUEST] Lead created'");
  const catchIdx = INTAKE_SRC.indexOf('Could not persist lead');
  assert.ok(logIdx > catchIdx, 'the created-log can still run after a failed write');
});

test('the intake acknowledges rather than silently accepts duplicate submissions', () => {
  // The fingerprint of the old bug was that duplicate detection could never
  // succeed, because the lookup itself was throwing.
  assert.match(INTAKE_SRC, /status: 'already_pending'/);
});
