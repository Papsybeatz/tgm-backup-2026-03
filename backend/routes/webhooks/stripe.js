const express = require('express');
const router  = express.Router();
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
    [process.env.STRIPE_AGENCY_STARTER_PRICE_ID]:   'agency_starter',
    [process.env.STRIPE_AGENCY_UNLIMITED_PRICE_ID]: 'agency_unlimited',
    [process.env.STRIPE_LIFETIME_PRICE_ID]:         'lifetime',
  };
}

// Mounted BEFORE express.json() — raw body required for signature verification
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
    console.log('[STRIPE WEBHOOK] verified ✓ event:', event.type);
  } catch (err) {
    console.warn('[STRIPE WEBHOOK] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook signature error: ${err.message}`);
  }

  try {
    const PRICE_TIER_MAP    = getPriceTierMap();
    const LIFETIME_PRICE_ID = process.env.STRIPE_LIFETIME_PRICE_ID;

    switch (event.type) {

      // ── New checkout completed ──────────────────────────────────────────────
      case 'checkout.session.completed': {
        const session    = event.data.object;
        const email      = session.customer_email || session.customer_details?.email;
        const subId      = session.subscription   || null;
        const customerId = session.customer        || null;
        const priceId    = session.metadata?.price_id || null;
        const tier       = PRICE_TIER_MAP[priceId]    || null;

        if (!email) { console.warn('[STRIPE WEBHOOK] no email on session'); return res.status(200).send('no email'); }
        if (!tier)  { console.warn('[STRIPE WEBHOOK] unknown priceId:', priceId); return res.status(200).send('unknown price'); }

        const isLifetime = priceId === LIFETIME_PRICE_ID;

        // For subscriptions, fetch currentPeriodEnd from the subscription object
        let currentPeriodEnd = null;
        if (subId && !isLifetime) {
          try {
            const sub    = await stripe.subscriptions.retrieve(subId);
            currentPeriodEnd = sub.current_period_end
              ? new Date(sub.current_period_end * 1000)
              : null;
          } catch (e) {
            console.warn('[STRIPE WEBHOOK] could not fetch subscription:', e.message);
          }
        }

        await upsertUser(email, {
          tier,
          subscriptionStatus: 'active',
          subscriptionType:   isLifetime ? 'one_time' : 'recurring',
          subscriptionId:     subId,
          stripeCustomerId:   customerId,
          currentPeriodEnd,
          provider:           'stripe',
        });
        console.log(`[STRIPE WEBHOOK] activated ${tier} for ${email} | periodEnd: ${currentPeriodEnd}`);
        return res.status(200).send('ok');
      }

      // ── Subscription renewed or plan changed ───────────────────────────────
      case 'customer.subscription.updated': {
        const sub            = event.data.object;
        const priceId        = sub.items?.data?.[0]?.price?.id;
        const tier           = PRICE_TIER_MAP[priceId] || null;
        const currentPeriodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : undefined;

        await prisma.user.updateMany({
          where: { subscriptionId: sub.id },
          data: {
            subscriptionStatus: sub.status,
            ...(tier             ? { tier }             : {}),
            ...(currentPeriodEnd ? { currentPeriodEnd } : {}),
          },
        });
        console.log(`[STRIPE WEBHOOK] subscription updated: ${sub.id} status=${sub.status}`);
        return res.status(200).send('ok');
      }

      // ── Subscription cancelled ─────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await prisma.user.updateMany({
          where: { subscriptionId: sub.id },
          data:  {
            tier:              'free',
            subscriptionStatus: 'canceled',
            subscriptionType:  'none',
            currentPeriodEnd:  null,
          },
        });
        console.log(`[STRIPE WEBHOOK] subscription canceled: ${sub.id}`);
        return res.status(200).send('ok');
      }

      // ── Invoice paid (renewal) ─────────────────────────────────────────────
      case 'invoice.paid': {
        const invoice = event.data.object;
        const subId   = invoice.subscription;
        if (!subId) return res.status(200).send('no subscription');

        // Fetch fresh subscription to get updated period end
        let currentPeriodEnd = null;
        try {
          const sub    = await stripe.subscriptions.retrieve(subId);
          currentPeriodEnd = sub.current_period_end
            ? new Date(sub.current_period_end * 1000)
            : null;
        } catch (e) {
          console.warn('[STRIPE WEBHOOK] could not fetch subscription for renewal:', e.message);
        }

        await prisma.user.updateMany({
          where: { subscriptionId: subId },
          data:  {
            subscriptionStatus: 'active',
            ...(currentPeriodEnd ? { currentPeriodEnd } : {}),
          },
        });
        console.log(`[STRIPE WEBHOOK] invoice paid / renewed: ${subId} | periodEnd: ${currentPeriodEnd}`);
        return res.status(200).send('ok');
      }

      // ── Payment failed (dunning) ───────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await prisma.user.updateMany({
            where: { subscriptionId: invoice.subscription },
            data:  { subscriptionStatus: 'past_due' },
          });
          console.log(`[STRIPE WEBHOOK] payment failed: ${invoice.subscription}`);
        }
        return res.status(200).send('ok');
      }

      // ── Refund ─────────────────────────────────────────────────────────────
      case 'charge.refunded': {
        const charge = event.data.object;
        if (charge.customer) {
          await prisma.user.updateMany({
            where: { stripeCustomerId: charge.customer },
            data:  {
              tier:              'free',
              subscriptionStatus: 'refunded',
              subscriptionType:  'none',
              currentPeriodEnd:  null,
            },
          });
          console.log(`[STRIPE WEBHOOK] refund processed for customer: ${charge.customer}`);
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

// ── Helper ────────────────────────────────────────────────────────────────────

async function upsertUser(email, update) {
  const crypto     = require('crypto');
  const randomPass = crypto.randomBytes(16).toString('hex');
  // Remove undefined values so Prisma doesn't try to set null on non-nullable fields
  const cleanUpdate = Object.fromEntries(
    Object.entries(update).filter(([, v]) => v !== undefined)
  );
  await prisma.user.upsert({
    where:  { email },
    update: cleanUpdate,
    create: { email, password: randomPass, role: 'user', ...cleanUpdate },
  });
  // Throws on error — lets the webhook return 500 so Stripe retries
}

module.exports = router;
