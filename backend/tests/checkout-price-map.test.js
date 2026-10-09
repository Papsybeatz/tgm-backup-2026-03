/**
 * The price -> tier map is a money path.
 *
 * A price that resolves to a tier string with no entry in src/config/tiers.js
 * charges the buyer and grants nothing: every feature accessor
 * (hasFeature, getTierLimits, getDashboardModules) falls back to TIERS.free, and
 * tierAtLeast() returns false for everything because indexOf() is -1.
 *
 * Funder plans are a separate, cycle-based product with their own webhook flow
 * and sidecar provisioning. They must never be reachable from the user checkout
 * route, so the two maps are kept apart and asserted here rather than trusted.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// Deterministic env BEFORE the maps are built. The maps are built per call, and
// an unset env var would make every key the string "undefined", collapsing the
// map into a single entry and hiding a real regression behind a config artefact.
process.env.STRIPE_STARTER_PRICE_ID = 'price_test_starter';
process.env.STRIPE_PRO_PRICE_ID = 'price_test_pro';
process.env.STRIPE_AGENCY_STARTER_PRICE_ID = 'price_test_agency_starter';
process.env.STRIPE_AGENCY_UNLIMITED_PRICE_ID = 'price_test_agency_unlimited';
process.env.STRIPE_LIFETIME_PRICE_ID = 'price_test_lifetime';
process.env.STRIPE_FUNDER_PILOT_PRICE_ID = 'price_test_funder_pilot';
process.env.STRIPE_FUNDER_SCALE_PRICE_ID = 'price_test_funder_scale';
process.env.STRIPE_FUNDER_ENTERPRISE_PRICE_ID = 'price_test_funder_enterprise';

const checkout = require('../routes/checkout');
const { getUserPriceTierMap, getFunderPriceMap } = checkout;

// src/config/tiers.js is an ES module, so it is parsed rather than required.
const TIER_CONFIG_SRC = read('src/config/tiers.js');
const CANONICAL_TIERS = [...TIER_CONFIG_SRC.matchAll(/^ {2}([a-z_]+): \{$/gm)].map((m) => m[1]);

const CHECKOUT_SRC = read('backend/routes/checkout.js');
const WEBHOOK_SRC = read('backend/routes/webhooks/stripe.js');
const AUTH_SRC = read('backend/routes/auth.js');

// ── The canonical tier list is what everything else is measured against ───────

test('the canonical tier config is readable and is the 6 expected tiers', () => {
  assert.deepEqual(CANONICAL_TIERS, [
    'free',
    'starter',
    'pro',
    'agency_starter',
    'agency_unlimited',
    'lifetime',
  ]);
});

// ── The user map holds exactly the sellable user tiers ───────────────────────

test('the user price map holds exactly the 5 sellable tiers, including lifetime', () => {
  const body = CHECKOUT_SRC
    .slice(CHECKOUT_SRC.indexOf('function getUserPriceTierMap'))
    .split('\n}')[0];

  const tiers = new Set((body.match(/'([a-z_]+)'/g) || []).map((q) => q.slice(1, -1)));

  // Each sellable tier now has TWO prices (monthly and annual), so the map has
  // more entries than tiers. What must stay exactly true is the TIER set: a
  // stray tier here is a tier the checkout accepts but src/config/tiers.js does
  // not define, which means the buyer pays and every feature accessor falls
  // back to free.
  assert.deepEqual(
    [...tiers].sort(),
    ['agency_starter', 'agency_unlimited', 'lifetime', 'pro', 'starter'],
    'the user price map must hold exactly the 5 sellable tiers',
  );
});

test('every tier in the user price map is a real tier in src/config/tiers.js', () => {
  // This is the property that was violated: a tier string the config does not
  // know silently degrades to free.
  for (const tier of Object.values(getUserPriceTierMap())) {
    assert.ok(
      CANONICAL_TIERS.includes(tier),
      `price maps to "${tier}", which is not a tier in src/config/tiers.js`,
    );
  }
});

test('every canonical tier except free has a price entry', () => {
  const priced = new Set(Object.values(getUserPriceTierMap()));
  for (const tier of CANONICAL_TIERS) {
    if (tier === 'free') {
      // free is the default tier and is not purchasable, so it has no price.
      assert.ok(!priced.has('free'), 'free must not be purchasable');
      continue;
    }
    assert.ok(priced.has(tier), `tier "${tier}" has no price entry`);
  }
});

// ── Funder prices are a different product and must not leak in ───────────────

test('the user price map contains no funder tier', () => {
  const values = Object.values(getUserPriceTierMap());
  for (const funderTier of ['funder_pilot', 'funder_scale', 'funder_enterprise']) {
    assert.ok(
      !values.includes(funderTier),
      `${funderTier} must not be reachable from the user checkout`,
    );
  }
});

test('the funder map holds exactly the three funder plans', () => {
  assert.deepEqual(Object.values(getFunderPriceMap()).sort(), [
    'funder_enterprise',
    'funder_pilot',
    'funder_scale',
  ]);
});

test('no price ID appears in both the user map and the funder map', () => {
  const userPrices = new Set(Object.keys(getUserPriceTierMap()));
  const overlap = Object.keys(getFunderPriceMap()).filter((p) => userPrices.has(p));
  assert.deepEqual(overlap, [], `price IDs in both maps: ${overlap.join(', ')}`);
});

// ── Route wiring: the maps are actually used where they must be ──────────────

test('/create-session validates against the user map, not a combined one', () => {
  assert.match(CHECKOUT_SRC, /const PRICE_TIER_MAP\s*=\s*getUserPriceTierMap\(\);/);
});

test('/create-session rejects a funder price with 400', () => {
  // The guard must exist and must name the funder case explicitly, so the log
  // says which mistake was made instead of a bare "unknown price".
  assert.match(CHECKOUT_SRC, /Funder plans are not sold through this endpoint/);
  assert.match(CHECKOUT_SRC, /funder_price_on_user_checkout/);
  assert.match(CHECKOUT_SRC, /getFunderPriceMap\(\)\[priceId\]/);
});

test('/create-funder-session validates against the funder map', () => {
  assert.match(CHECKOUT_SRC, /const FUNDER_PRICE_MAP\s*=\s*getFunderPriceMap\(\);/);
});

// ── annual_pro is gone everywhere ────────────────────────────────────────────

test('annual_pro is not referenced in any backend source', () => {
  for (const [name, src] of [
    ['checkout.js', CHECKOUT_SRC],
    ['webhooks/stripe.js', WEBHOOK_SRC],
    ['auth.js', AUTH_SRC],
  ]) {
    assert.doesNotMatch(
      src,
      /STRIPE_ANNUAL_PRO_PRICE_ID/,
      `${name} still references the unsold annual_pro price`,
    );
  }
});

test('/prices does not advertise an annual Pro price', () => {
  assert.doesNotMatch(CHECKOUT_SRC, /annual_pro\s*:/);
});

test('/prices still exposes the funder block for the funder landing page', () => {
  // Dropping annual_pro must not take the funder price IDs with it: the funder
  // page reads them to call create-funder-session.
  assert.match(CHECKOUT_SRC, /funder:\s*\{/);
  assert.match(CHECKOUT_SRC, /pilot:\s*FUNDER_PILOT_PRICE_ID/);
});

// ── The other two copies of the map are user-only too ────────────────────────

test('the webhook resolves tiers through a user-only map', () => {
  assert.match(WEBHOOK_SRC, /function getUserPriceTierMap\(\)/);
  assert.match(WEBHOOK_SRC, /const PRICE_TIER_MAP = getUserPriceTierMap\(\);/);
  assert.doesNotMatch(WEBHOOK_SRC, /'funder_pilot':|\[FUNDER_PILOT_PRICE_ID\]/);
});

test('auth subscription reconciliation resolves tiers through a user-only map', () => {
  assert.match(AUTH_SRC, /function getUserPriceTierMap\(\)/);
  assert.match(AUTH_SRC, /return getUserPriceTierMap\(\)\[priceId\] \|\| null;/);
  assert.doesNotMatch(AUTH_SRC, /\[FUNDER_PILOT_PRICE_ID\]:\s*'funder_pilot'/);
});

test('a stray funder tier is still routed through Stripe verification', () => {
  // Deliberate: listing the funder tiers in STRIPE_PAID_TIERS means a bogus
  // `funder_*` user tier fails verification against the user-only map and is
  // downgraded to free, rather than surviving forever.
  assert.match(AUTH_SRC, /STRIPE_PAID_TIERS/);
  assert.match(AUTH_SRC, /'funder_pilot',/);
  assert.match(AUTH_SRC, /tier: 'free',/);
});

/* ── annual prices ───────────────────────────────────────────────────────── */

test('every sellable tier has an annual price that maps to the same tier', () => {
  const body = CHECKOUT_SRC
    .slice(CHECKOUT_SRC.indexOf('function getUserPriceTierMap'))
    .split('\n}')[0];

  for (const [tier, env] of [
    ['starter', 'STRIPE_STARTER_ANNUAL_PRICE_ID'],
    ['pro', 'STRIPE_PRO_ANNUAL_PRICE_ID'],
    ['agency_starter', 'STRIPE_AGENCY_STARTER_ANNUAL_PRICE_ID'],
  ]) {
    assert.match(
      body,
      new RegExp(`\\[process\\.env\\.${env}\\]:\\s*'${tier}'`),
      `${tier} annual price must map back to ${tier}`,
    );
  }
});

test('the webhook and auth price maps also know the annual prices', () => {
  // The webhook map is what actually GRANTS the tier, and auth's map is what
  // reconciliation uses to decide a subscription still entitles the account.
  // An annual price missing from either one charges the card and grants
  // nothing — the worst failure mode in the whole billing path.
  for (const [name, src] of [['webhook', WEBHOOK_SRC], ['auth', AUTH_SRC]]) {
    for (const env of [
      'STRIPE_STARTER_ANNUAL_PRICE_ID',
      'STRIPE_PRO_ANNUAL_PRICE_ID',
      'STRIPE_AGENCY_STARTER_ANNUAL_PRICE_ID',
    ]) {
      assert.match(src, new RegExp(`process\\.env\\.${env}`), `${name} map is missing ${env}`);
    }
  }
});

test('need-based pricing is a coupon and fails loudly when unconfigured', () => {
  assert.match(CHECKOUT_SRC, /STRIPE_NEED_BASED_COUPON_ID/);
  assert.match(CHECKOUT_SRC, /discounts\s*=\s*\[\{\s*coupon/);
  assert.match(CHECKOUT_SRC, /503/);
});

test('the prices endpoint exposes the annual ids and the need-based flag', () => {
  assert.match(CHECKOUT_SRC, /annual:\s*\{/);
  assert.match(CHECKOUT_SRC, /needBasedAvailable/);
});
