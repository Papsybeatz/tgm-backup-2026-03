/**
 * The annual -> tier chain, executed end to end through the real webhook handler.
 *
 * checkout-price-map.test.js asserts the price maps by reading source text. That
 * proves the entries exist; it does not prove the handler grants the tier. This
 * file drives the actual Express route with an actual Stripe-signed event and
 * asserts what the user's tier becomes.
 *
 * Why this is the right level of test: the failure this guards against is
 * "card charged, tier never granted" — silent, and discovered by the customer.
 * The chain is:
 *
 *   checkout.create-session  validates priceId against getUserPriceTierMap()
 *                            and 400s on anything unmapped
 *        |                   writes metadata.price_id = priceId
 *        v
 *   webhook                  reads session.metadata.price_id
 *                            -> PRICE_TIER_MAP[priceId] -> applyStripeAccess(tier)
 *
 * Because create-session refuses an unmapped price before a session exists, a
 * price that reaches the webhook has already resolved through the same map
 * function. The two halves cannot disagree without the checkout rejecting the
 * sale first. These tests pin both halves.
 *
 * Only two things are stubbed: Prisma (so no production row is touched) and the
 * outbound alert/email helpers (so no real alert is sent). Stripe signature
 * verification is the real SDK.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// ── env must be set before the routes are required ───────────────────────────
const PRICES = {
  starter: 'price_test_starter',
  pro: 'price_test_pro',
  agency_starter: 'price_test_agency_starter',
  starter_annual: 'price_test_starter_annual',
  pro_annual: 'price_test_pro_annual',
  agency_starter_annual: 'price_test_agency_starter_annual',
  lifetime: 'price_test_lifetime',
};
process.env.STRIPE_STARTER_PRICE_ID = PRICES.starter;
process.env.STRIPE_PRO_PRICE_ID = PRICES.pro;
process.env.STRIPE_AGENCY_STARTER_PRICE_ID = PRICES.agency_starter;
process.env.STRIPE_STARTER_ANNUAL_PRICE_ID = PRICES.starter_annual;
process.env.STRIPE_PRO_ANNUAL_PRICE_ID = PRICES.pro_annual;
process.env.STRIPE_AGENCY_STARTER_ANNUAL_PRICE_ID = PRICES.agency_starter_annual;
process.env.STRIPE_LIFETIME_PRICE_ID = PRICES.lifetime;
delete process.env.STRIPE_AGENCY_UNLIMITED_PRICE_ID;
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy_for_signature_verification';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_annual_chain';
process.env.APP_URL = 'https://example.test';

// ── stub the real Stripe SDK's network calls, keep its signature verification ─
const realStripe = require('stripe')('sk_test_dummy');
const stripeCalls = [];
const fakeStripe = {
  // constructEvent reads verifyHeader off `this`, so it must be bound to the
  // webhooks object itself, not to the Stripe instance.
  webhooks: { constructEvent: realStripe.webhooks.constructEvent.bind(realStripe.webhooks) },
  subscriptions: {
    retrieve: async (id) => {
      stripeCalls.push({ fn: 'subscriptions.retrieve', id });
      return {
        id,
        status: 'active',
        current_period_end: 1790000000,
        customer: 'cus_test',
        items: { data: [{ price: { id: PRICES.pro_annual } }] },
      };
    },
  },
  customers: { create: async () => ({ id: 'cus_test' }) },
};
require.cache[require.resolve('stripe')] = {
  id: require.resolve('stripe'),
  filename: require.resolve('stripe'),
  loaded: true,
  exports: () => fakeStripe,
};

// ── stub Prisma so no production row is written ──────────────────────────────
const users = new Map();
const alertCalls = [];
const fakePrisma = {
  user: {
    findUnique: async ({ where }) => {
      if (where.id) return users.get(where.id) || null;
      if (where.email) return [...users.values()].find((u) => u.email === where.email) || null;
      return null;
    },
    findFirst: async ({ where }) =>
      [...users.values()].find((u) => u.stripeCustomerId === where.stripeCustomerId) || null,
    update: async ({ where, data }) => {
      const u = users.get(where.id);
      if (!u) throw new Error(`no such user ${where.id}`);
      Object.assign(u, data);
      return u;
    },
  },
  errorLog: { create: async () => ({}) },
  funderLead: { findUnique: async () => null, update: async () => ({}) },
  funderCycle: { update: async () => ({}) },
};
require.cache[require.resolve('@prisma/client')] = {
  id: require.resolve('@prisma/client'),
  filename: require.resolve('@prisma/client'),
  loaded: true,
  exports: { PrismaClient: function PrismaClient() { return fakePrisma; } },
};

const stub = (rel) => {
  const p = require.resolve(path.join(__dirname, '..', rel));
  require.cache[p] = { id: p, filename: p, loaded: true, exports: {} };
};
stub('utils/brevo');
stub('utils/alerting');
require.cache[require.resolve(path.join(__dirname, '..', 'utils', 'alerting'))].exports = {
  alertOnBusinessFailure: async (payload) => { alertCalls.push(payload); },
};

const express = require('express');
const webhookRouter = require('../routes/webhooks/stripe');

// ── a real HTTP server so the real router + raw body parsing are exercised ───
let server;
let base;
test.before(async () => {
  const app = express();
  app.use(webhookRouter);
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server && server.close());

function resetUsers() {
  users.clear();
  alertCalls.length = 0;
  stripeCalls.length = 0;
  users.set('u1', {
    id: 'u1', email: 'buyer@example.test', tier: 'free',
    subscriptionStatus: 'none', stripeCustomerId: null,
  });
}

/** POST a genuinely Stripe-signed event at the real route. */
async function deliver(event) {
  const payload = JSON.stringify(event);
  const sig = realStripe.webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET,
  });
  const res = await fetch(`${base}/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': sig },
    body: payload,
  });
  return { status: res.status, body: await res.text() };
}

function checkoutCompleted(priceId, overrides = {}) {
  return {
    id: 'evt_test', type: 'checkout.session.completed',
    data: { object: {
      id: 'cs_test',
      metadata: { price_id: priceId, user_id: 'u1', checkout_context: 'app' },
      subscription: 'sub_test',
      customer: 'cus_test',
      customer_details: { email: 'buyer@example.test' },
      ...overrides,
    } },
  };
}

/* ── signature verification is real, so a bad signature must be rejected ───── */
test('an unsigned event is rejected before any tier is granted', async () => {
  resetUsers();
  const res = await fetch(`${base}/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=deadbeef' },
    body: JSON.stringify(checkoutCompleted(PRICES.pro_annual)),
  });
  assert.equal(res.status, 400, 'a forged signature must not be accepted');
  assert.equal(users.get('u1').tier, 'free', 'no tier may be granted on a bad signature');
});

/* ── the three annual prices each grant their tier ─────────────────────────── */
for (const [tier, priceId] of [
  ['starter', PRICES.starter_annual],
  ['pro', PRICES.pro_annual],
  ['agency_starter', PRICES.agency_starter_annual],
]) {
  test(`annual checkout for ${tier} grants ${tier}`, async () => {
    resetUsers();
    const res = await deliver(checkoutCompleted(priceId));
    assert.equal(res.status, 200);
    assert.equal(users.get('u1').tier, tier, `annual ${tier} price must grant ${tier}`);
    assert.equal(users.get('u1').subscriptionType, 'recurring');
    assert.equal(alertCalls.length, 0, 'a successful annual sale must not raise an alert');
  });
}

/* ── monthly still works: the annual work must not have regressed it ───────── */
test('monthly checkout still grants the same tier as its annual twin', async () => {
  resetUsers();
  await deliver(checkoutCompleted(PRICES.pro));
  assert.equal(users.get('u1').tier, 'pro');
});

/* ── the annual price resolves to the SAME tier as the monthly one ─────────── */
test('annual and monthly prices for one tier grant an identical tier string', async () => {
  resetUsers();
  await deliver(checkoutCompleted(PRICES.pro));
  const monthly = users.get('u1').tier;
  resetUsers();
  await deliver(checkoutCompleted(PRICES.pro_annual));
  const annual = users.get('u1').tier;
  assert.notEqual(monthly, 'free', 'the monthly sale must actually grant a tier');
  assert.notEqual(annual, 'free', 'the annual sale must actually grant a tier');
  assert.equal(annual, monthly, 'billing interval must not change the granted tier');
});

/* ── an unmapped price must not silently pass ──────────────────────────────── */
test('an unmapped price grants nothing and raises a business alert', async () => {
  resetUsers();
  const res = await deliver(checkoutCompleted('price_does_not_exist'));
  assert.equal(res.status, 200, 'Stripe must not be asked to retry a permanent mapping gap');
  assert.equal(users.get('u1').tier, 'free', 'an unmapped price must not change the tier');
  assert.equal(alertCalls.length, 1, 'an unmapped paid price must alert — the customer paid');
  assert.equal(alertCalls[0].kind, 'checkout_unknown_price');
});

/* ── the cancellation path still downgrades correctly ──────────────────────── */
test('subscription.deleted returns the user to free', async () => {
  resetUsers();
  users.get('u1').tier = 'pro';
  users.get('u1').stripeCustomerId = 'cus_test';
  const res = await deliver({
    id: 'evt_del', type: 'customer.subscription.deleted',
    data: { object: { id: 'sub_test', customer: 'cus_test' } },
  });
  assert.equal(res.status, 200);
  assert.equal(users.get('u1').tier, 'free');
  assert.equal(users.get('u1').subscriptionStatus, 'canceled');
});

/* ── the checkout half: an unmapped price can never reach a charge ─────────── */
test('create-session rejects an unmapped price, so it can never be charged', () => {
  const fs = require('node:fs');
  const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'checkout.js'), 'utf8');
  const at = src.indexOf('const tier = PRICE_TIER_MAP[priceId];');
  assert.ok(at > -1, 'create-session must resolve the tier from the map');
  const after = src.slice(at, at + 900);
  assert.match(after, /if \(!tier\)/, 'create-session must refuse a price with no tier');
  assert.match(after, /status\(400\)/, 'the refusal must be a 400, before any session is created');
  assert.ok(
    at < src.indexOf('stripe.checkout.sessions.create'),
    'the tier check must run before any Stripe session is created',
  );
});

/* ── the metadata bridge: what checkout writes is what the webhook reads ───── */
test('buildSessionParams carries the annual price into metadata.price_id', () => {
  const { buildSessionParams } = require('../routes/checkout');
  assert.equal(typeof buildSessionParams, 'function', 'buildSessionParams must be exported for this pin');
  const params = buildSessionParams({
    priceId: PRICES.pro_annual, customerId: 'cus_test', userId: 'u1',
    checkoutContext: 'app', successPath: '/ok', cancelPath: '/cancel', couponId: null,
  });
  assert.equal(params.metadata.price_id, PRICES.pro_annual,
    'the webhook reads metadata.price_id, so the annual id must be written there');
  assert.equal(params.subscription_data.metadata.price_id, PRICES.pro_annual,
    'renewal events read the subscription metadata, so it must carry the annual id too');
  assert.equal(params.line_items[0].price, PRICES.pro_annual, 'the charge must be the annual price');
});
