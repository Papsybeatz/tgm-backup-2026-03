/**
 * Invite acceptance — the end-to-end flow.
 *
 * This was one of three flows never exercised live. The existing team-invite
 * tests only assert on source text; they never drive the endpoint, so the
 * branch that matters most — an invited person signing in with the WRONG
 * address and being refused — was never actually run.
 *
 * Here the router is mounted on a real express app and driven over HTTP, with
 * @prisma/client and the auth middleware stubbed so the whole decision tree
 * runs without a database.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const express = require('express');

// ── stubs, installed before the router is required ─────────────────────────
function stub(key, exports) {
  const m = new Module(key);
  m.filename = key;
  m.loaded = true;
  m.exports = exports;
  require.cache[key] = m;
}

const PRISMA_KEY = require.resolve('@prisma/client');
const AUTH_KEY = require.resolve('../middleware/auth');

let currentUser = { id: 'u1', email: 'owner@example.com' };
let invites = new Map();
let userUpdates = [];

stub(PRISMA_KEY, {
  PrismaClient: function () {
    return {
      invite: {
        findUnique: async ({ where }) => invites.get(where.id) || null,
        update: async ({ where, data }) => {
          const inv = invites.get(where.id);
          if (!inv) throw new Error('invite vanished');
          Object.assign(inv, data);
          return inv;
        },
      },
      user: {
        update: async ({ where, data }) => {
          userUpdates.push({ id: where.id, data });
          return { id: where.id, ...data };
        },
      },
    };
  },
});
stub(AUTH_KEY, (req, _res, next) => {
  req.user = currentUser;
  next();
});

const router = require('../routes/invite.js');

const app = express();
app.use(express.json());
app.use('/api/invite', router);
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

test.after(() => server.close());

function reset() {
  invites = new Map();
  userUpdates = [];
  currentUser = { id: 'u1', email: 'owner@example.com' };
}

async function accept(token) {
  const res = await fetch(`${base}/api/invite/${token}/accept`, { method: 'POST' });
  return { status: res.status, body: await res.json() };
}

/* ── the decision tree ─────────────────────────────────────────────── */

test('a missing token is rejected as a bad request', async () => {
  reset();
  const r = await accept('%20'); // trims to empty
  assert.equal(r.status, 400);
  assert.equal(r.body.success, false);
});

test('an unknown token is not found', async () => {
  reset();
  const r = await accept('does-not-exist');
  assert.equal(r.status, 404);
  assert.equal(r.body.reason, 'not_found');
});

test('a cancelled invite is refused and says so', async () => {
  reset();
  invites.set('tok-cancelled', { id: 'tok-cancelled', status: 'cancelled', email: 'a@b.com', tier: 'pro' });
  const r = await accept('tok-cancelled');
  assert.equal(r.status, 410);
  assert.equal(r.body.reason, 'cancelled');
});

test('the wrong signed-in account is refused — the email-match check works', async () => {
  reset();
  invites.set('tok-1', { id: 'tok-1', status: 'pending', email: 'invitee@example.com', tier: 'pro' });
  currentUser = { id: 'u9', email: 'someone.else@example.com' };

  const r = await accept('tok-1');

  assert.equal(r.status, 403);
  assert.equal(r.body.reason, 'email_mismatch');
  assert.match(r.body.message, /invitee@example\.com/, 'the refusal names the invited address');
  // and nothing was granted
  assert.equal(userUpdates.length, 0, 'a refused acceptance must not change a tier');
  assert.equal(invites.get('tok-1').status, 'pending', 'a refused acceptance must not consume the invite');
});

test('the invited account accepts and is granted the seat tier', async () => {
  reset();
  invites.set('tok-2', { id: 'tok-2', status: 'pending', email: 'invitee@example.com', tier: 'agency_starter' });
  currentUser = { id: 'u2', email: 'invitee@example.com' };

  const r = await accept('tok-2');

  assert.equal(r.status, 200);
  assert.equal(r.body.success, true);
  assert.equal(r.body.tier, 'agency_starter');
  assert.equal(invites.get('tok-2').status, 'accepted', 'the invite is marked accepted');
  assert.ok(invites.get('tok-2').acceptedAt instanceof Date, 'acceptedAt is stamped');
  assert.deepEqual(
    userUpdates,
    [{ id: 'u2', data: { tier: 'agency_starter' } }],
    'the invitee joins at the inviter plan level, not as a fresh free user'
  );
});

test('email matching is case- and whitespace-insensitive', async () => {
  reset();
  invites.set('tok-3', { id: 'tok-3', status: 'pending', email: '  Invitee@Example.COM ', tier: 'pro' });
  currentUser = { id: 'u3', email: 'invitee@example.com' };

  const r = await accept('tok-3');
  assert.equal(r.status, 200, 'a differently-cased address is the same person');
  assert.equal(userUpdates.length, 1);
});

test('accepting twice is idempotent and does not double-grant', async () => {
  reset();
  invites.set('tok-4', { id: 'tok-4', status: 'pending', email: 'invitee@example.com', tier: 'pro' });
  currentUser = { id: 'u4', email: 'invitee@example.com' };

  const first = await accept('tok-4');
  const second = await accept('tok-4');

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(second.body.alreadyAccepted, true, 'the second arrival reports it was already accepted');
  assert.equal(userUpdates.length, 1, 'the tier is granted once, not once per arrival');
});

/* ── the invite lookup endpoint the page calls first ────────────────── */

test('GET /:token reports validity without consuming the invite', async () => {
  reset();
  invites.set('tok-5', { id: 'tok-5', status: 'pending', email: 'invitee@example.com', tier: 'pro' });
  const res = await fetch(`${base}/api/invite/tok-5`);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(invites.get('tok-5').status, 'pending', 'looking must not consume the invite');
  assert.ok(body);
});

test('GET /:token on an accepted invite reports already_accepted', async () => {
  reset();
  invites.set('tok-6', { id: 'tok-6', status: 'accepted', email: 'invitee@example.com', tier: 'pro' });
  const res = await fetch(`${base}/api/invite/tok-6`);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.valid, false);
  assert.equal(body.reason, 'already_accepted');
});
