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

const { hasFeature, requireFeature, TIERS } = require('../middleware/tierAuth');

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
 * The two things a tier unlocks through a feature gate.
 *
 * Each group is satisfied by ANY of its features. Collaboration is a third gate
 * but it is carried by a limit, not a feature: seat counts scale within the
 * group (Pro 3, Agency 10, Agency+ unlimited), which is why the ladder test
 * below allows a step that adds no new gate but raises a cap.
 */
const GATE_GROUPS = {
  keep_and_send: ['version_history', 'email_delivery'],
  client_work: ['client_folders', 'client_aware_steve'],
};

const APPLICANT_LADDER = ['free', 'starter', 'pro', 'agency_starter', 'agency_unlimited'];

const seatCap = (tier) => (TIERS[tier] && TIERS[tier].limits && TIERS[tier].limits.teamSeats) || 0;

const groupsHeld = (tier) => {
  const held = Object.entries(GATE_GROUPS)
    .filter(([, features]) => features.some((f) => hasFeature(tier, f)))
    .map(([group]) => group);
  if (seatCap(tier) > 0) held.push('seats');
  return held.sort();
};

test('Free can download but keeps nothing, sends nothing, and has no client work', () => {
  // Download is the payoff that makes them upgrade — it must never be gated.
  assert.equal(hasFeature('free', 'export_pdf'), true, 'Free must be able to export PDF');
  assert.equal(hasFeature('free', 'export_doc'), true, 'Free must be able to export DOCX');

  // But nothing is kept or sent.
  assert.equal(hasFeature('free', 'version_history'), false);
  assert.equal(hasFeature('free', 'email_delivery'), false);
  assert.equal(hasFeature('free', 'client_folders'), false);
  assert.equal(hasFeature('free', 'client_aware_steve'), false);

  // And the capability itself is deliberately NOT the gate.
  assert.equal(hasFeature('free', 'draft_basic'), true, 'drafting must not be the barrier');
  assert.equal(hasFeature('free', 'scoring_basic'), true, 'scoring must not be the barrier');
});

test('each upgrade unlocks exactly one new gate', () => {
  const expected = {
    free: [],
    starter: ['keep_and_send'],
    pro: ['keep_and_send', 'seats'],
    agency_starter: ['client_work', 'keep_and_send', 'seats'],
    agency_unlimited: ['client_work', 'keep_and_send', 'seats'],
  };

  for (const tier of APPLICANT_LADDER) {
    assert.deepEqual(groupsHeld(tier), expected[tier].slice().sort(), `${tier} holds the wrong gates`);
  }

  // Every step either adds one new gate or scales an existing one, and no step
  // ever takes a gate away. Agency+ adds no gate — it raises the seat cap from
  // 10 to unlimited, which is what the step has to be worth.
  for (let i = 1; i < APPLICANT_LADDER.length; i += 1) {
    const prev = APPLICANT_LADDER[i - 1];
    const next = APPLICANT_LADDER[i];
    const before = groupsHeld(prev);
    const after = groupsHeld(next);
    const added = after.filter((g) => !before.includes(g));
    const removed = before.filter((g) => !after.includes(g));

    assert.ok(added.length <= 1, `${next} should add at most one gate, added ${added}`);
    assert.equal(removed.length, 0, `${next} must not remove a gate: ${removed}`);
    if (added.length === 0) {
      assert.ok(
        seatCap(next) > seatCap(prev),
        `${next} adds no gate, so it must raise the seat cap (${seatCap(prev)} -> ${seatCap(next)})`
      );
    }
  }
});

test('Founding Member is Starter-level — no seats, no client work', () => {
  assert.equal(hasFeature('lifetime', 'version_history'), true);
  assert.equal(hasFeature('lifetime', 'email_delivery'), true);

  assert.equal(seatCap('lifetime'), 0, 'no Pro seats');
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
    client_folders: 'agency_starter',
    client_aware_steve: 'agency_starter',
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
