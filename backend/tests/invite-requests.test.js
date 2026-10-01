/**
 * Invite-request waitlist.
 *
 * The bug these pin: the waitlist was a JSON file under backend/data/, written
 * by a synchronous read-modify-write. Railway's filesystem is ephemeral, so
 * every redeploy discarded the entire list — and concurrent submissions raced.
 *
 * Two further defects surfaced while fixing it, and both have a test here
 * because either alone would have made the persistence fix pointless:
 *   - the public form POSTed to '/request-invite', which the SPA catch-all
 *     answered with 405, so nothing ever reached the backend;
 *   - the route required a `name` the form never sent, so a reachable request
 *     would still have been rejected with 400.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROUTES = path.join(__dirname, '..', 'routes');
const INVITE_SRC = fs.readFileSync(path.join(ROUTES, 'invite.js'), 'utf8');
const ADMIN_SRC = fs.readFileSync(path.join(ROUTES, 'admin.js'), 'utf8');
const FORM_SRC = fs.readFileSync(
  path.join(__dirname, '..', '..', 'src', 'components', 'InviteRequestForm.jsx'),
  'utf8',
);
const SCHEMA_SRC = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8');
const ENSURE_SRC = fs.readFileSync(path.join(__dirname, '..', 'utils', 'ensureSchema.js'), 'utf8');
const MIGRATION_DIR = path.join(__dirname, '..', 'prisma', 'migrations', '20261002000000_invite_requests');

const { sanitize, deriveName } = require('../routes/invite').__test;

/* ───────────────────────────── storage ───────────────────────────── */

test('the waitlist no longer touches the filesystem', () => {
  // The whole point: an ephemeral-disk write cannot be the system of record.
  assert.doesNotMatch(INVITE_SRC, /require\('fs'\)/, 'no fs in the invite router');
  assert.doesNotMatch(INVITE_SRC, /require\('path'\)/, 'no path in the invite router');
  assert.doesNotMatch(INVITE_SRC, /inviteRequests\.json/, 'the JSON store must be gone');
  assert.doesNotMatch(INVITE_SRC, /writeFileSync|readFileSync/, 'no synchronous file IO');
});

test('the waitlist is persisted through the InviteRequest table', () => {
  assert.match(INVITE_SRC, /prisma\.inviteRequest\.upsert\(/);
  assert.match(SCHEMA_SRC, /model InviteRequest \{/);
  assert.match(SCHEMA_SRC, /email\s+String\s+@unique/, 'a repeat submission must not duplicate a row');
});

test('the waitlist is not conflated with granted seats', () => {
  // Invite carries inviterId + tier and grants a seat. A request grants nothing.
  assert.doesNotMatch(INVITE_SRC, /prisma\.invite\.create/);
  assert.match(SCHEMA_SRC, /model Invite \{/);
  assert.match(SCHEMA_SRC, /model InviteRequest \{/);
});

test('the migration is additive and idempotent', () => {
  const sql = fs.readFileSync(path.join(MIGRATION_DIR, 'migration.sql'), 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "InviteRequest"/);
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS "InviteRequest_email_key"/);
  assert.doesNotMatch(sql, /DROP\s/i, 'the migration must not drop anything');
});

test('the table has a boot-time parachute, like the error log', () => {
  // The data this replaces was destroyed by exactly the event the parachute
  // guards against: a redeploy where the migration did not apply.
  assert.match(ENSURE_SRC, /label: 'InviteRequest table'/);
  assert.match(ENSURE_SRC, /CREATE TABLE IF NOT EXISTS "InviteRequest"/);
  assert.match(ENSURE_SRC, /InviteRequest_email_key/);
});

test('the orphaned file-based admin reader is gone', () => {
  assert.ok(
    !fs.existsSync(path.join(ROUTES, 'adminInvite.js')),
    'adminInvite.js read the same JSON file and was never mounted',
  );
});

/* ───────────────────────── endpoint contract ───────────────────────── */

test('the endpoint keeps its route and response shape', () => {
  assert.match(INVITE_SRC, /router\.post\('\/request-invite'/);
  assert.match(INVITE_SRC, /\{ success: true, message: 'Invite request received\.' \}/);
  assert.match(INVITE_SRC, /\{ success: false, message: 'Name and email are required\.' \}/);
  assert.match(INVITE_SRC, /Failed to save invite request\./);
});

test('an email is required, but a name is not', () => {
  // The marketing form collects only an email. Requiring a name rejected every
  // genuine lead that arrived.
  assert.match(INVITE_SRC, /if \(!sanitize\(email\)\)/);
  assert.doesNotMatch(INVITE_SRC, /if \(!name \|\| !email\)/);
});

test('a resubmission cannot wipe detail already captured', () => {
  assert.match(INVITE_SRC, /const update = \{\};/);
  assert.match(INVITE_SRC, /if \(derivedName\) update\.name/);
});

test('the endpoint is reachable as an admin list', () => {
  assert.match(ADMIN_SRC, /router\.get\('\/invite-requests',\s*requireAdmin/);
});

/* ───────────────────────── input handling ───────────────────────── */

test('sanitize strips markup and control characters', () => {
  assert.equal(sanitize('  jane@example.com  '), 'jane@example.com');
  assert.equal(sanitize('a<script>alert(1)</script>'), 'ascriptalert1script');
  assert.equal(sanitize(null), '');
  assert.equal(sanitize(undefined), '');
});

test('a name is derived from the address when the caller omits one', () => {
  assert.equal(deriveName('', 'jane@example.com'), 'jane');
  assert.equal(deriveName('   ', 'jane@example.com'), 'jane');
  assert.equal(deriveName('Jane Doe', 'jane@example.com'), 'Jane Doe');
  assert.equal(deriveName(null, 'jane@example.com'), 'jane');
});

/* ───────────────────────── the client that calls it ───────────────────────── */

test('the form posts to the path the API is actually mounted at', () => {
  // It posted to '/request-invite', which the SPA catch-all answered with 405.
  assert.match(FORM_SRC, /fetch\('\/api\/invite\/request-invite'/);
  assert.doesNotMatch(FORM_SRC, /fetch\('\/request-invite'/);
});

test('the form asserts on the body, so a 200 that is not a success cannot look like one', () => {
  assert.match(FORM_SRC, /const body = await res\.json\(\)/);
  assert.match(FORM_SRC, /if \(!res\.ok \|\| !body\.success\)/);
});

test('the form sends the name when it has one', () => {
  assert.match(FORM_SRC, /name: user\?\.name \|\| ''/);
});
