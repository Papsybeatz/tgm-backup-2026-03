const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes('REPLACE')) return null;
  try {
    return require('stripe')(key);
  } catch (e) {
    console.warn('[STRIPE WEBHOOK] stripe SDK not available:', e.message);
    return null;
  }
}

// Built at request time so Railway env vars are always resolved
function getPriceTierMap() {
  return {
    [process.env.STRIPE_STARTER_PRICE_ID]:          'starter',
    [process.env.STRIPE_PRO_PRICE_ID]:              'pro',
    [process.env.STRIPE_AGENCY_STARTER_PRICE_ID]:   'agency_starter',
    [process.env.STRIPE_AGENCY_UNLIMITED_PRICE_ID]: 'agency_unlimited',
    [process.env.STRIPE_LIFETIME_PRICE_ID]:         'lifetime',
  };
}

// Must be mounted BEFORE express.json() — needs raw body for signature verification
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    console.error('[STRIPE WEBHOOK] STRIPE_SECRET_KEY not set');
    return res.status(500).send('Stripe not configured');
  }

  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.warn('[STRIPE WEBHOOK] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook signature error: ${err.message}`);
  }

  console.log('[STRIPE WEBHOOK] event:', event.type);

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session       = event.data.object;
        const email         = session.customer_email || session.customer_details?.email;
        const subId         = session.subscription || null;
        const customerId    = session.customer || null;
        const priceId       = session.metadata?.price_id || null;
        const PRICE_TIER_MAP    = getPriceTierMap();
        const LIFETIME_PRICE_ID = process.env.STRIPE_LIFETIME_PRICE_ID;
        const tier          = PRICE_TIER_MAP[priceId] || null;

        if (!email) { console.warn('[STRIPE WEBHOOK] no email on session'); return res.status(200).send('no email'); }
        if (!tier)  { console.warn('[STRIPE WEBHOOK] unknown price', priceId); return res.status(200).send('unknown price'); }

        const isLifetime = priceId === LIFETIME_PRICE_ID;
        await upsertUser(email, {
          tier,
          subscriptionStatus: 'active',
          subscriptionType:   isLifetime ? 'one_time' : 'recurring',
          subscriptionId:     subId,
          stripeCustomerId:   customerId,
          provider:           'stripe',
        });
        console.log(`[STRIPE WEBHOOK] activated ${tier} for ${email}`);
        return res.status(200).send('ok');
      }

      case 'customer.subscription.updated': {
        const sub     = event.data.object;
        const priceId = sub.items?.data?.[0]?.price?.id;
        const tier    = getPriceTierMap()[priceId] || null;
        await prisma.user.updateMany({
          where: { subscriptionId: sub.id },
          data:  { subscriptionStatus: sub.status, ...(tier ? { tier } : {}) },
        });
        return res.status(200).send('ok');
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await prisma.user.updateMany({
          where: { subscriptionId: sub.id },
          data:  { tier: 'free', subscriptionStatus: 'canceled', subscriptionType: 'none' },
        });
        return res.status(200).send('ok');
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await prisma.user.updateMany({
            where: { subscriptionId: invoice.subscription },
            data:  { subscriptionStatus: 'past_due' },
          });
        }
        return res.status(200).send('ok');
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        if (charge.customer) {
          await prisma.user.updateMany({
            where: { stripeCustomerId: charge.customer },
            data:  { tier: 'free', subscriptionStatus: 'refunded', subscriptionType: 'none' },
          });
        }
        return res.status(200).send('ok');
      }

      default:
        return res.status(200).send('ignored');
    }
  } catch (err) {
    console.error('[STRIPE WEBHOOK] handler error:', err);
    return res.status(500).send('handler error');
  }
});

async function upsertUser(email, update) {
  const crypto     = require('crypto');
  const randomPass = crypto.randomBytes(16).toString('hex');
  try {
    await prisma.user.upsert({
      where:  { email },
      update,
      create: { email, password: randomPass, role: 'user', ...update },
    });
  } catch (e) {
    console.error('[STRIPE WEBHOOK] upsert failed for', email, e.message);
  }
}

module.exports = router;
