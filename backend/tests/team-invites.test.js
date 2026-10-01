/**
 * Team invite tests
 * ----------------------------------------------------------------------------
 * Guards the bug that made the entire team feature fake in production.
 *
 * server.js mounted routes/team.js — an in-memory stub with a hardcoded
 * `let team = { used: 2, pendingInvites: [...] }` — at /api/team BEFORE the
 * DB-backed teamInvites router. Express matches in mount order, so every call
 * the UI actually made (/status, /add, /remove, /resend-invite, /cancel-invite)
 * hit the stub. It showed two fake pending invites to every account, wrote
 * nothing to the database, and emailed a link built from the invitee's EMAIL
 * ADDRESS while the accept endpoint looks up an Invite row id — so no invite
 * could ever be accepted.
 *
 * These tests pin the wiring, the invite link, and the seat cap.
 *
 * Run: cd backend && npm run test:team
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.APP_URL = 'https://www.thegrantsmaster.com';

const { __test } = require('../routes/teamInvites');
const { buildInviteLink, seatCapFor, normaliseEmail } = __test;

const SERVER_SRC = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const ROUTES_DIR = path.join(__dirname, '..', 'routes');
const TEAM_SRC = fs.readFileSync(path.join(ROUTES_DIR, 'teamInvites.js'), 'utf8');

test('the in-memory stub is gone and /api/team is mounted exactly once', () => {
  assert.equal(
    fs.existsSync(path.join(ROUTES_DIR, 'team.js')),
    false,
    'routes/team.js must stay deleted — it shadowed the DB-backed router',
  );
  const mounts = SERVER_SRC.match(/app\.use\(\s*'\/api\/team'/g) || [];
  assert.equal(mounts.length, 1, 'exactly one router may own /api/team');
  assert.match(SERVER_SRC, /app\.use\('\/api\/team', teamInvitesRoutes\)/);
});

test('the team router uses the session middleware, not the req.user stub', () => {
  assert.match(
    TEAM_SRC,
    /require\('\.\.\/middleware\/auth'\)/,
    'must use middleware/auth — roleAuth only checks req.user, which nothing sets on this path',
  );
  assert.doesNotMatch(TEAM_SRC, /require\('\.\.\/middleware\/roleAuth'\)/);
});

test('the emailed link carries the Invite row token, on the acceptance page', () => {
  const link = buildInviteLink('a1b2c3');
  assert.equal(link, 'https://www.thegrantsmaster.com/invite/accept?token=a1b2c3');
});

test('the link is built from a token, never from the invitee email', () => {
  const link = buildInviteLink('invite-row-id');
  assert.doesNotMatch(link, /@/, 'a link containing @ is the old email-as-token bug');
});

test('the inviter is taken from the session, never from the request body', () => {
  assert.match(TEAM_SRC, /inviterId:\s*user\.id/, 'inviterId must come from req.user');
  assert.doesNotMatch(TEAM_SRC, /req\.body\.inviterId|req\.body\?\.inviterId/);
});

test('seat caps come from the tier table', () => {
  assert.equal(seatCapFor('agency_starter'), 10);
  assert.equal(seatCapFor('pro'), 3);
  assert.equal(seatCapFor('agency_unlimited'), Infinity);
  assert.equal(seatCapFor('free'), 0);
  assert.equal(seatCapFor('lifetime'), 0, 'Founding Member has no team seats');
  assert.equal(seatCapFor('does_not_exist'), 0);
});

test('emails are normalised before they are stored or compared', () => {
  assert.equal(normaliseEmail('  Person@Example.COM '), 'person@example.com');
});

test('status no longer serves hardcoded invite data', () => {
  assert.doesNotMatch(
    TEAM_SRC,
    /pending1@email\.com|pending2@email\.com/,
    'the fake seed invites must not come back',
  );
  assert.match(TEAM_SRC, /prisma\.invite\.findMany/, 'pending invites must be read from the database');
  assert.match(TEAM_SRC, /prisma\.invite\.create/, 'invites must be written to the database');
});
