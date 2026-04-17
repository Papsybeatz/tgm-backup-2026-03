
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
// Webhooks should be publicly accessible (signature verified); do not requireAuth
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SIGNING_SECRET = process.env.LEMONSQUEEZY_SIGNING_SECRET;

const TIER_MAP = {
  STARTER: 'starter',
  PRO: 'pro',
  AGENCY_STARTER: 'agency_starter',
  AGENCY_UNLIMITED: 'agency_unlimited',
  LIFETIME: 'lifetime'
};

const LIFETIME_VARIANT_ID = process.env.LEMONSQUEEZY_LIFETIME_VARIANT_ID || '963478';

router.post('/lemon-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const rawBody = (typeof req.body === 'string') ? req.body : (req.body && typeof req.body.toString === 'function' ? req.body.toString() : null);
  const signature = req.headers['x-signature'] || req.headers['x-lemon-signature'] || req.headers['x-lemon-squeezy-signature'];

  // verify signature when secret available
  if (SIGNING_SECRET) {
    const hmacInput = JSON.stringify(req.body);
    const computed = crypto.createHmac('sha256', SIGNING_SECRET).update(hmacInput).digest('hex');
    if (!signature || computed !== signature) {
      console.warn('[LEMON] signature mismatch', { provided: signature, computed });
      try { console.log('[LEMON] rawBody sample:', (rawBody && rawBody.slice ? rawBody.slice(0,200) : JSON.stringify(req.body).slice(0,200))); } catch(e) {}
      return res.status(403).send('Invalid signature');
    }
  }

  let payload;
  // prefer parsed body when available (express.json may have already parsed it)
  payload = req.body;

  const eventType = payload.event || payload.event_name || payload.type;

  // Handle lifetime one-time purchase
  if (eventType === 'order_created' || eventType === 'order.completed') {
    // LemonSqueezy order shape
    const order = payload.data?.attributes || payload.data || payload;
    const variantId = order.variant_id || order.variant?.id || null;
    const email = order.user_email || order.customer_email || order.customer?.email || payload.data?.customer_email;

    if (String(variantId) === String(LIFETIME_VARIANT_ID)) {
      const update = {
        tier: TIER_MAP.LIFETIME,
        subscriptionStatus: 'active',
        subscriptionType: 'one_time',
        subscriptionId: String(order.id || order.order_id || ''),
        provider: 'lemonsqueezy'
      };

      if (email) {
        await upsertPrismaOnly(email, update);
        return res.status(200).send('ok');
      }
      // Try by customer id if no email — lookup in Prisma
      const customerId = order.customer_id || order.customer?.id || payload.data?.customer_id;
      if (customerId) {
        try {
          const pUser = await prisma.user.findFirst({ where: { lemonCustomerId: String(customerId) } });
          if (pUser && pUser.email) {
            await upsertPrismaOnly(pUser.email, update);
            return res.status(200).send('ok');
          }
        } catch (e) {
          console.error('[LEMON] prisma lookup/update failed', e);
          return res.status(500).send('DB error');
        }
      }
      return res.status(404).send('User not found');
    }
  }

  // Optional: refund handling
  if (eventType === 'order_refunded' || eventType === 'refund.created') {
    const eventId = payload.data?.id || payload.data?.attributes?.id || null;
    if (eventId) {
      try {
        await prisma.user.updateMany({ where: { subscriptionId: String(eventId) }, data: { tier: 'free', subscriptionStatus: 'canceled', subscriptionType: 'none' } });
      } catch (e) {
        console.error('[LEMON] refund handler failed', e);
      }
    }
    return res.status(200).send('ok');
  }

  console.log('[LEMON] Unhandled event', eventType);
  return res.status(200).send('ignored');
});

async function upsertPrismaOnly(email, update) {
  const randomPass = crypto.randomBytes(16).toString('hex');
  try {
    await prisma.user.upsert({ where: { email }, update, create: Object.assign({ email, password: randomPass }, update) });
  } catch (e) {
    console.error('[PRISMA] upsert failed (lemon):', e);
  }
}

module.exports = router;
