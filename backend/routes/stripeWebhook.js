const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Tier mapping canonical across providers
const TIER_MAP = {
  STARTER: 'starter',
  PRO: 'pro',
  AGENCY_STARTER: 'agency_starter',
  AGENCY_UNLIMITED: 'agency_unlimited',
  LIFETIME: 'lifetime'
};

// Price IDs configured in env
const STRIPE_STARTER_PRICE_ID = process.env.STRIPE_STARTER_PRICE_ID || 'price_starter';
const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || 'price_pro';
const STRIPE_AGENCY_STARTER_PRICE_ID = process.env.STRIPE_AGENCY_STARTER_PRICE_ID || 'price_agency_starter';
const STRIPE_AGENCY_UNLIMITED_PRICE_ID = process.env.STRIPE_AGENCY_UNLIMITED_PRICE_ID || 'price_agency_unlimited';
const STRIPE_LIFETIME_PRICE_ID = process.env.STRIPE_LIFETIME_PRICE_ID || 'price_lifetime';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || null;

let stripe = null;
try {
  // eslint-disable-next-line global-require
  stripe = require('stripe')(process.env.STRIPE_API_KEY);
} catch (e) {
  console.warn('[STRIPE WEBHOOK] stripe SDK not available; falling back to non-verified parsing');
}

// Use raw body middleware when signature verification is desired
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const raw = req.body;

  let event;
  if (stripe && STRIPE_WEBHOOK_SECRET) {
    const sig = req.headers['stripe-signature'];
    try {
      event = stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('[STRIPE WEBHOOK] Signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  } else {
    try {
      event = JSON.parse(raw.toString());
    } catch (e) {
      console.error('[STRIPE WEBHOOK] invalid json', e);
      return res.status(400).send('Invalid JSON');
    }
  }

  try {
    await handleStripeEvent(event);
    return res.status(200).send('ok');
  } catch (e) {
    console.error('[STRIPE WEBHOOK] handler error', e);
    return res.status(500).send('handler error');
  }
});

async function upsertPrismaUserByEmail(email, data) {
  const randomPass = crypto.randomBytes(16).toString('hex');
  try {
    await prisma.user.upsert({
      where: { email },
      update: data,
      create: Object.assign({ email, password: randomPass }, data)
    });
  } catch (e) {
    console.error('[PRISMA] upsert error for', email, e);
  }
}

async function handleStripeEvent(event) {
  const type = event.type;
  // Handle checkout session completed => initial purchase/upgrades
  if (type === 'checkout.session.completed') {
    const session = event.data.object;
    // attempt to read price id from expanded line_items if present
    let priceId = null;
    try {
      priceId = session.line_items?.[0]?.price?.id || session.display_items?.[0]?.price?.id || session.metadata?.price_id || null;
    } catch (e) {
      priceId = null;
    }

    let tier = null;
    if (String(priceId) === String(STRIPE_STARTER_PRICE_ID)) tier = TIER_MAP.STARTER;
    if (String(priceId) === String(STRIPE_PRO_PRICE_ID)) tier = TIER_MAP.PRO;
    if (String(priceId) === String(STRIPE_AGENCY_STARTER_PRICE_ID)) tier = TIER_MAP.AGENCY_STARTER;
    if (String(priceId) === String(STRIPE_AGENCY_UNLIMITED_PRICE_ID)) tier = TIER_MAP.AGENCY_UNLIMITED;
    if (String(priceId) === String(STRIPE_LIFETIME_PRICE_ID)) tier = TIER_MAP.LIFETIME;

    if (tier) {
      const email = session.customer_email || session.customer_details?.email || null;
      const subscriptionId = session.subscription || null;
      const update = {
        tier,
        subscriptionStatus: 'active',
        subscriptionType: tier === TIER_MAP.LIFETIME ? 'one_time' : 'recurring',
        subscriptionId: subscriptionId || undefined,
        provider: 'stripe'
      };

      if (email) {
        await upsertPrismaUserByEmail(email, update);
      }
    }
  }

  // Subscription lifecycle events
  if (type === 'customer.subscription.updated') {
    const sub = event.data.object;
    try {
      await prisma.user.updateMany({ where: { subscriptionId: sub.id }, data: { subscriptionStatus: sub.status } });
    } catch (e) {
      console.error('[STRIPE] subscription.updated handler error', e);
    }
  }

  if (type === 'customer.subscription.deleted') {
    const id = event.data.object.id;
    try {
      await prisma.user.updateMany({ where: { subscriptionId: id }, data: { tier: 'free', subscriptionStatus: 'canceled', subscriptionType: 'none' } });
    } catch (e) {
      console.error('[STRIPE] subscription.deleted handler error', e);
    }
  }
}

module.exports = router;
