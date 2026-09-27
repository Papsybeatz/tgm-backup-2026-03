/**
 * Tier gate tests
 * ----------------------------------------------------------------------------
 * Verifies the re-gate end to end at the level that actually matters: the
 * enforcement middleware, not just the config.
 *
 * The model: tiers sell KEEPING and SENDING your work, COLLABORATION, and
 * MULTI-CLIENT work. They do not sell AI capability — Steve drafts, scores and
 * rewrites for everyone.
 *
 * Run: cd backend && npm run test:tiers
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { hasFeature, requireFeature } = require('../middleware/tierAuth');

/**
 * Run a gate exactly as Express would and report what it did.
 * This is the real middleware, so a passing test means the route is protected.
 */
function runGate(feature, tier) {
  const middleware = requireFeature(feature);
  let statusCode = null;
  let body = null;
  let nextCalled = false;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    },
  };

  middleware({ user: { tier }, body: {} }, res, () => {
    nextCalled = true;
  });

  return { allowed: nextCalled, statusCode, body };
}

/**
 * The four things a tier can actually unlock.
 *
 * Each group is satisfied by ANY of its features, because tiers scale within a
 * group (Agency has 10 seats where Pro has 3) rather than adding a new one.
 */
const GATE_GROUPS = {
  keep_and_send: ['save_drafts', 'version_history', 'email_delivery'],
  collaborate: ['team_seats_3', 'team_seats_10', 'team_seats_unlimited'],
  client_work: ['client_folders', 'client_aware_steve'],
  scale: ['analytics_portfolio', 'admin_controls', 'dedicated_success_manager'],
};

const APPLICANT_LADDER = ['free', 'starter', 'pro', 'agency_starter', 'agency_unlimited'];

const groupsHeld = (tier) =>
  Object.entries(GATE_GROUPS)
    .filter(([, features]) => features.some((f) => hasFeature(tier, f)))
    .map(([group]) => group);

test('Free can download but keeps nothing, sends nothing, and has no client work', () => {
  // Download is the payoff that makes them upgrade — it must never be gated.
  assert.equal(hasFeature('free', 'export_pdf'), true, 'Free must be able to export PDF');
  assert.equal(hasFeature('free', 'export_doc'), true, 'Free must be able to export DOCX');

  // But nothing is kept or sent.
  assert.equal(hasFeature('free', 'save_drafts'), false);
  assert.equal(hasFeature('free', 'version_history'), false);
  assert.equal(hasFeature('free', 'email_delivery'), false);
  assert.equal(hasFeature('free', 'client_folders'), false);
  assert.equal(hasFeature('free', 'client_aware_steve'), false);

  // And AI capability is deliberately NOT the gate.
  assert.equal(hasFeature('free', 'ai_rewrite'), true, 'AI must not be the barrier');
  assert.equal(hasFeature('free', 'scoring_engine'), true, 'scoring must not be the barrier');
});

test('each upgrade unlocks exactly one new gate', () => {
  const expected = {
    free: [],
    starter: ['keep_and_send'],
    pro: ['keep_and_send', 'collaborate'],
    agency_starter: ['keep_and_send', 'collaborate', 'client_work'],
    agency_unlimited: ['keep_and_send', 'collaborate', 'client_work', 'scale'],
  };

  for (const tier of APPLICANT_LADDER) {
    const held = groupsHeld(tier).sort();
    assert.deepEqual(held, expected[tier].slice().sort(), `${tier} holds the wrong gates`);
  }

  // The delta between consecutive tiers is exactly one group, in order.
  for (let i = 1; i < APPLICANT_LADDER.length; i += 1) {
    const prev = groupsHeld(APPLICANT_LADDER[i - 1]);
    const next = groupsHeld(APPLICANT_LADDER[i]);
    const added = next.filter((g) => !prev.includes(g));
    const removed = prev.filter((g) => !next.includes(g));
    assert.equal(added.length, 1, `${APPLICANT_LADDER[i]} should add exactly one gate, added ${added}`);
    assert.equal(removed.length, 0, `${APPLICANT_LADDER[i]} must not remove a gate: ${removed}`);
  }
});

test('Founding Member is Starter-level — no seats, no client work', () => {
  assert.equal(hasFeature('lifetime', 'save_drafts'), true);
  assert.equal(hasFeature('lifetime', 'version_history'), true);
  assert.equal(hasFeature('lifetime', 'email_delivery'), true);

  assert.equal(hasFeature('lifetime', 'team_seats_3'), false, 'no Pro seats');
  assert.equal(hasFeature('lifetime', 'client_folders'), false, 'no Agency clients');
  assert.equal(hasFeature('lifetime', 'client_aware_steve'), false);
});

test('the gate middleware actually refuses a Free user', () => {
  for (const feature of ['email_delivery', 'version_history', 'client_aware_steve', 'client_folders']) {
    const result = runGate(feature, 'free');
    assert.equal(result.allowed, false, `free must be refused ${feature}`);
    assert.equal(result.statusCode, 403, `${feature} must return 403`);
    assert.equal(result.body.requiredFeature, feature);
  }
});

test('the gate middleware admits the tier that owns each feature', () => {
  const owners = {
    email_delivery: 'starter',
    version_history: 'starter',
    save_drafts: 'starter',
    team_seats_3: 'pro',
    client_folders: 'agency_starter',
    client_aware_steve: 'agency_starter',
    team_seats_unlimited: 'agency_unlimited',
  };

  for (const [feature, tier] of Object.entries(owners)) {
    const result = runGate(feature, tier);
    assert.equal(result.allowed, true, `${tier} must be allowed ${feature}`);
    assert.equal(result.statusCode, null);
  }
});

test('client-aware Steve stays locked until Agency, at every tier below it', () => {
  for (const tier of ['free', 'starter', 'pro', 'lifetime']) {
    assert.equal(runGate('client_aware_steve', tier).allowed, false, `${tier} must not have client-aware Steve`);
  }
  assert.equal(runGate('client_aware_steve', 'agency_starter').allowed, true);
});

test('an unknown tier falls back to Free rather than granting access', () => {
  const result = runGate('email_delivery', 'some_tier_that_does_not_exist');
  assert.equal(result.allowed, false, 'an unknown tier must not be treated as paid');
  assert.equal(result.statusCode, 403);
});
