const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes('REPLACE')) return null;
  try { return require('stripe')(key); }
  catch (e) { console.warn('[STRIPE WEBHOOK] stripe SDK not available:', e.message); return null; }
}

function getPriceTierMap() {
  return {
    [process.env.STRIPE_STARTER_PRICE_ID]:          'starter',
    [process.env.STRIPE_PRO_PRICE_ID]:              'pro',
    [process.env.STRIPE_ANNUAL_PRO_PRICE_ID]:       'pro',
    [process.env.STRIPE_AGENCY_STARTER_PRICE_ID]:   'agency_starter',
    [process.env.STRIPE_AGENCY_UNLIMITED_PRICE_ID]: 'agency_unlimited',
    [process.env.STRIPE_LIFETIME_PRICE_ID]:         'lifetime',
  };
}

function clean(data) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

async function logStripeEvent(event, userId, message) {
  try {
    await prisma.errorLog.create({
      data: {
        message: `${event.type}: ${message}`,
        endpoint: 'stripe-webhook',
        userId: userId || null,
        severity: 'info',
      },
    });
  } catch (error) {
    console.warn('[STRIPE WEBHOOK] could not log event:', error.message);
  }
}

async function findUser({ userId, customerId, email }) {
  if (userId) {
    const byId = await prisma.user.findUnique({ where: { id: String(userId) } });
    if (byId) return byId;
  }
  if (customerId) {
    const byCustomer = await prisma.user.findFirst({ where: { stripeCustomerId: String(customerId) } });
    if (byCustomer) return byCustomer;
  }
  if (email) {
    const byEmail = await prisma.user.findUnique({ where: { email: String(email) } });
    if (byEmail) return byEmail;
  }
  return null;
}

async function applyStripeAccess({ event, user, tier, subscriptionStatus, subscriptionType, subscriptionId, stripeCustomerId, currentPeriodEnd }) {
  if (!user) return null;
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: clean({
      tier,
      subscriptionStatus,
      subscriptionType,
      subscriptionId,
      stripeCustomerId,
      currentPeriodEnd,
      provider: 'stripe',
    }),
  });
  await logStripeEvent(event, updated.id, `tier=${updated.tier} status=${updated.subscriptionStatus}`);
  return updated;
}

async function getSubscriptionDetails(stripe, subscriptionId) {
  if (!subscriptionId) return { currentPeriodEnd: null, priceId: null, status: null, customerId: null };
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  return {
    currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
    priceId: sub.items?.data?.[0]?.price?.id || null,
    status: sub.status || null,
    customerId: sub.customer || null,
  };
}

async function handleStripeEvent(req, res) {
  const stripe = getStripe();
  if (!stripe) {
    console.error('[STRIPE WEBHOOK] STRIPE_SECRET_KEY not set');
    return res.status(500).send('Stripe not configured');
  }

  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.warn('[STRIPE WEBHOOK] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook signature error: ${err.message}`);
  }

  try {
    const PRICE_TIER_MAP = getPriceTierMap();
    const LIFETIME_PRICE_ID = process.env.STRIPE_LIFETIME_PRICE_ID;

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const priceId = session.metadata?.price_id || null;
        const tier = PRICE_TIER_MAP[priceId] || null;
        const subscriptionId = session.subscription || null;
        const customerId = session.customer || null;
        const email = session.customer_details?.email || session.customer_email || null;
        const user = await findUser({ userId: session.metadata?.user_id, customerId, email });

        if (!user) { await logStripeEvent(event, null, 'no matching user'); return res.status(200).send('no user'); }
        if (!tier) { await logStripeEvent(event, user.id, `unknown price ${priceId}`); return res.status(200).send('unknown price'); }

        const isLifetime = priceId === LIFETIME_PRICE_ID;
        let currentPeriodEnd = null;
        let subscriptionStatus = 'active';
        if (subscriptionId && !isLifetime) {
          const details = await getSubscriptionDetails(stripe, subscriptionId);
          currentPeriodEnd = details.currentPeriodEnd;
          subscriptionStatus = details.status || 'active';
        }

        await applyStripeAccess({
          event,
          user,
          tier,
          subscriptionStatus,
          subscriptionType: isLifetime ? 'one_time' : 'recurring',
          subscriptionId,
          stripeCustomerId: customerId,
          currentPeriodEnd,
        });
        return res.status(200).send('ok');
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const priceId = sub.items?.data?.[0]?.price?.id || null;
        const tier = PRICE_TIER_MAP[priceId] || null;
        const user = await findUser({ userId: sub.metadata?.user_id, customerId: sub.customer });
        if (!user) { await logStripeEvent(event, null, `no matching user for ${sub.id}`); return res.status(200).send('no user'); }
        if (!tier) { await logStripeEvent(event, user.id, `unknown price ${priceId}`); return res.status(200).send('unknown price'); }

        await applyStripeAccess({
          event,
          user,
          tier,
          subscriptionStatus: sub.status,
          subscriptionType: 'recurring',
          subscriptionId: sub.id,
          stripeCustomerId: sub.customer,
          currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
        });
        return res.status(200).send('ok');
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription || null;
        if (!subscriptionId) return res.status(200).send('no subscription');
        const details = await getSubscriptionDetails(stripe, subscriptionId);
        const tier = PRICE_TIER_MAP[details.priceId] || undefined;
        const user = await findUser({ customerId: details.customerId });
        if (!user) { await logStripeEvent(event, null, `no user for ${subscriptionId}`); return res.status(200).send('no user'); }

        await applyStripeAccess({
          event,
          user,
          tier,
          subscriptionStatus: 'active',
          subscriptionType: 'recurring',
          subscriptionId,
          stripeCustomerId: details.customerId,
          currentPeriodEnd: details.currentPeriodEnd,
        });
        return res.status(200).send('ok');
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const user = await findUser({ customerId: sub.customer });
        if (!user) return res.status(200).send('no user');
        await applyStripeAccess({
          event,
          user,
          tier: 'free',
          subscriptionStatus: 'canceled',
          subscriptionType: 'none',
          subscriptionId: null,
          stripeCustomerId: sub.customer,
          currentPeriodEnd: null,
        });
        return res.status(200).send('ok');
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const user = await findUser({ customerId: invoice.customer });
        if (!user) return res.status(200).send('no user');
        await prisma.user.update({
          where: { id: user.id },
          data: { subscriptionStatus: 'past_due', provider: 'stripe' },
        });
        await logStripeEvent(event, user.id, 'payment failed');
        return res.status(200).send('ok');
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        const user = await findUser({ customerId: charge.customer });
        if (!user) return res.status(200).send('no user');
        await applyStripeAccess({
          event,
          user,
          tier: 'free',
          subscriptionStatus: 'refunded',
          subscriptionType: 'none',
          subscriptionId: null,
          stripeCustomerId: charge.customer,
          currentPeriodEnd: null,
        });
        return res.status(200).send('ok');
      }

      default:
        await logStripeEvent(event, null, 'ignored');
        return res.status(200).send('ignored');
    }
  } catch (err) {
    console.error('[STRIPE WEBHOOK] handler error:', err);
    return res.status(500).send('handler error');
  }
}

const rawJson = express.raw({ type: 'application/json' });
router.post('/stripe-webhook', rawJson, handleStripeEvent);
router.post('/webhook', rawJson, handleStripeEvent);

module.exports = router;
