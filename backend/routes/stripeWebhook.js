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

// Accept JSON from any source (Stripe CLI, manual curl, Stripe dashboard test)
// The raw middleware conflict with app-level express.json() means req.body
// will be either a Buffer (safe .toString()) or an already-parsed object.
router.post('/stripe-webhook', async (req, res) => {
  const raw = req.body;
  let rawBuffer;
  if (Buffer.isBuffer(raw)) {
    rawBuffer = raw;
  } else {
    rawBuffer = Buffer.from(typeof raw === 'string' ? raw : JSON.stringify(raw));
  }

  let event;
  if (stripe && STRIPE_WEBHOOK_SECRET) {
    const sig = req.headers['stripe-signature'];
    if (!sig) {
      return res.status(400).send('Missing stripe-signature header');
    }
    try {
      event = stripe.webhooks.constructEvent(rawBuffer, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('[STRIPE WEBHOOK] Signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  } else {
    try {
      event = JSON.parse(rawBuffer.toString('utf8'));
    } catch (e) {
      console.error('[STRIPE WEBHOOK] invalid json', e.message);
      return res.status(400).send('Invalid JSON');
    }
  }

  try {
    await handleStripeEvent(event);
    return res.status(200).send('ok');
  } catch (e) {
    console.error('[STRIPE WEBHOOK] handler error', e.message);
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
    // Handle checkout.session.completed => initial purchase/upgrades
    if (type === 'checkout.session.completed') {
      const session = event.data.object;
      // Accept either a full Stripe session event or a minimal manual test payload
      const customerEmail = session.customer_email
        || session.customer_details?.email
        || (session.test ? session.test.customer_email : null);

      // Accept a test flag so real-type events (checkout.session.completed) pass through
      // without requiring the stripe SDK to expand line_items.
      if (typeof session === 'object' && session.test) {
        // Minimal manual test event received — validate structure
        const priceId = session.metadata?.price_id || null;
        const tierMapForTest = {
          [STRIPE_STARTER_PRICE_ID]: 'starter',
          [STRIPE_PRO_PRICE_ID]: 'pro',
          [STRIPE_AGENCY_STARTER_PRICE_ID]: 'agency_starter',
          [STRIPE_AGENCY_UNLIMITED_PRICE_ID]: 'agency_unlimited',
          [STRIPE_LIFETIME_PRICE_ID]: 'lifetime',
        };
        const tier = tierMapForTest[priceId];
        if (tier && customerEmail) {
          try {
            await upsertPrismaUserByEmail(customerEmail, {
              tier,
              subscriptionStatus: 'active',
              subscriptionType: tier === 'lifetime' ? 'one_time' : 'recurring',
              provider: 'stripe',
            });
            console.log('[STRIPE WEBHOOK] test event processed:', customerEmail, tier);
          } catch (dbErr) {
            console.error('[STRIPE WEBHOOK] db error on test event:', dbErr.message);
          }
        }
        return; // processed — do not try to expand line_items
      }

      // Normal full Stripe event — try to read price id from expanded line_items
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
