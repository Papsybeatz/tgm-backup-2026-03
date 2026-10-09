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

test('each upgrade adds only the gates its price is meant to buy', () => {
  const expected = {
    free: [],
    starter: ['keep_and_send'],
    // Client work starts here, not at Agency. A $79 tier that added nothing but
    // three seats over the $29 tier was a step buyers skip; Agency keeps the
    // part that makes it a firm's tier — 10 seats and client-aware Steve.
    pro: ['client_work', 'keep_and_send', 'seats'],
    agency_starter: ['client_work', 'keep_and_send', 'seats'],
    agency_unlimited: ['client_work', 'keep_and_send', 'seats'],
  };

  for (const tier of APPLICANT_LADDER) {
    assert.deepEqual(groupsHeld(tier), expected[tier].slice().sort(), `${tier} holds the wrong gates`);
  }

  // Each step is pinned explicitly rather than by a generic "at most one new
  // gate" rule, because the Writer -> Consultant step is deliberately bigger:
  // it buys client work AND seats at once. The two steps above it add no new
  // gate at all — they only raise the seat cap, which is what they have to be
  // worth. No step may ever take a gate away.
  const ADDED_PER_STEP = {
    starter: ['keep_and_send'],
    pro: ['client_work', 'seats'],
    agency_starter: [],
    agency_unlimited: [],
  };

  for (let i = 1; i < APPLICANT_LADDER.length; i += 1) {
    const prev = APPLICANT_LADDER[i - 1];
    const next = APPLICANT_LADDER[i];
    const before = groupsHeld(prev);
    const after = groupsHeld(next);
    const added = after.filter((g) => !before.includes(g)).sort();
    const removed = before.filter((g) => !after.includes(g));

    assert.deepEqual(
      added,
      ADDED_PER_STEP[next].slice().sort(),
      `${next} added the wrong gates`
    );
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
