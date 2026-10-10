/**
 * A retired tier must be unsellable, not merely unpopular.
 *
 * The Founding Member tier was taken off the pricing page, but the checkout
 * path stayed open: /prices still advertised the price, /onboarding still
 * rendered a "$499 one-time (limited to 100 seats)" button that called
 * startCheckout, and create-session still accepted the price. The only thing
 * bounding it was a seat cap — so deleting the cap without closing the path
 * would have made an already-reachable retired tier unlimited.
 *
 * These tests pin the two halves: the checkout refuses the tier, and no surface
 * still offers it. The grandfathered side is pinned too — the tier must keep
 * resolving for the people who already own it.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

process.env.STRIPE_STARTER_PRICE_ID = 'price_test_starter';
process.env.STRIPE_PRO_PRICE_ID = 'price_test_pro';
process.env.STRIPE_AGENCY_STARTER_PRICE_ID = 'price_test_agency_starter';
process.env.STRIPE_LIFETIME_PRICE_ID = 'price_test_lifetime';
process.env.STRIPE_AGENCY_UNLIMITED_PRICE_ID = 'price_test_agency_unlimited';

const checkout = require('../routes/checkout');
const CHECKOUT_SRC = read('backend/routes/checkout.js');

/* ── the guard itself ──────────────────────────────────────────────────────── */
test('the retired set covers every tier that was taken off sale', () => {
  assert.ok(checkout.RETIRED_TIERS instanceof Set, 'RETIRED_TIERS must be exported');
  assert.ok(checkout.RETIRED_TIERS.has('lifetime'), 'Founding Member must be retired');
  assert.ok(checkout.RETIRED_TIERS.has('agency_unlimited'), 'Agency+ must be retired');
});

test('no sellable tier is accidentally retired', () => {
  for (const tier of ['starter', 'pro', 'agency_starter']) {
    assert.ok(!checkout.RETIRED_TIERS.has(tier), `${tier} is on sale and must not be refused`);
  }
});

test('create-session refuses a retired tier before any session is created', () => {
  const at = CHECKOUT_SRC.indexOf('if (RETIRED_TIERS.has(tier))');
  assert.ok(at > -1, 'create-session must refuse a retired tier');
  const created = CHECKOUT_SRC.indexOf('stripe.checkout.sessions.create');
  assert.ok(created > -1, 'the session creation call must exist');
  assert.ok(at < created, 'the refusal must run before a Stripe session is created');
  assert.match(CHECKOUT_SRC.slice(at, at + 400), /status\(410\)/,
    'a retired tier is gone, not merely unavailable: 410, not 400');
});

/* ── the seat cap this replaced ────────────────────────────────────────────── */
test('the Founding Member seat cap is gone from the money path', () => {
  assert.doesNotMatch(CHECKOUT_SRC, /FOUNDING_MEMBER_SEATS/,
    'the seat cap must not survive in checkout.js');
  assert.doesNotMatch(CHECKOUT_SRC, /founding_member_sold_out/,
    'the sold-out response must not survive in checkout.js');
  assert.doesNotMatch(CHECKOUT_SRC, /Starter is \$29\/month/,
    'the sold-out message advertised a price for a tier that is not for sale');
});

test('no other backend route keeps a second Founding Member cap', () => {
  for (const rel of ['backend/routes/admin.js']) {
    assert.doesNotMatch(read(rel), /FOUNDING_MEMBER_SEATS|LIFETIME_CAP/,
      `${rel} still carries a cap for a tier that is not sold`);
  }
});

/* ── no surface still offers it ────────────────────────────────────────────── */
test('no page offers Founding Member for sale', () => {
  const files = ['src/components/OnboardingPage.jsx', 'src/pages/MonitoringDashboard.jsx'];
  for (const rel of files) {
    const src = read(rel);
    assert.doesNotMatch(src, /Founding Member/i, `${rel} still names the retired tier`);
    assert.doesNotMatch(src, /\$499/, `${rel} still quotes the retired price`);
    assert.doesNotMatch(src, /unlockLifetime|LifetimeBadge|LifetimeTierCountdown/,
      `${rel} still carries the retired tier's UI`);
  }
});

test('the onboarding page no longer fetches prices it cannot use', () => {
  const src = read('src/components/OnboardingPage.jsx');
  assert.doesNotMatch(src, /checkout\/prices/,
    'the lifetime checkout was the only consumer of this fetch');
});

/* ── grandfathered owners keep what they bought ────────────────────────────── */
test('the retired tiers still resolve for grandfathered owners', () => {
  const map = checkout.getUserPriceTierMap();
  assert.equal(map['price_test_lifetime'], 'lifetime',
    'a grandfathered lifetime owner must still resolve to their tier');
  assert.equal(map['price_test_agency_unlimited'], 'agency_unlimited',
    'a grandfathered Agency+ owner must still resolve to their tier');
});

test('the grandfathered tiers keep a display name', () => {
  const tiers = read('src/config/tiers.js');
  assert.match(tiers, /name: 'Founding Member \(legacy\)'/,
    'grandfathered owners must still see a label for what they own');
});
