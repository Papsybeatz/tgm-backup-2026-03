const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SIGNING_SECRET = process.env.LEMONSQUEEZY_SIGNING_SECRET;

// Variant ID → internal tier key
const VARIANT_TIER_MAP = {
  '1562436': 'lifetime',
  '1562526': 'starter',
  '1562476': 'pro',
  '1198257': 'agency_starter',
  '1198313': 'agency_unlimited',
};

const LIFETIME_VARIANT_ID = '1562436';
const LIFETIME_CAP = 200;

function verifySignature(rawBody, signature) {
  if (!SIGNING_SECRET) return true;
  const computed = crypto.createHmac('sha256', SIGNING_SECRET).update(rawBody).digest('hex');
  return computed === signature;
}

async function upsertUser(email, update) {
  const randomPass = crypto.randomBytes(16).toString('hex');
  try {
    await prisma.user.upsert({
      where: { email },
      update,
      create: Object.assign({ email, password: randomPass, role: 'user' }, update),
    });
    console.log('[LEMON] upserted user', email, JSON.stringify(update));
  } catch (e) {
    console.error('[LEMON] upsert failed for', email, e.message);
  }
}

router.post('/lemon-webhook', express.raw({ type: '*/*' }), async (req, res) => {
  const rawBody = req.body instanceof Buffer ? req.body.toString('utf8') : String(req.body);
  const signature =
    req.headers['x-signature'] ||
    req.headers['x-lemon-signature'] ||
    req.headers['x-lemon-squeezy-signature'] || '';

  if (!verifySignature(rawBody, signature)) {
    console.warn('[LEMON] signature mismatch — rejected');
    return res.status(403).send('Invalid signature');
  }

  let payload;
  try { payload = JSON.parse(rawBody); }
  catch (e) { return res.status(400).send('Invalid JSON'); }

  const eventName = payload.meta?.event_name || payload.event_name || payload.event || '';
  const attrs = payload.data?.attributes || {};
  const email = attrs.user_email || attrs.customer_email || payload.data?.customer_email || null;
  const variantId = String(attrs.variant_id || attrs.first_subscription_item?.variant_id || '');
  const subscriptionId = String(payload.data?.id || attrs.subscription_id || '');
  const customerId = String(attrs.customer_id || payload.data?.customer_id || '');
  const tier = VARIANT_TIER_MAP[variantId] || null;

  console.log('[LEMON] event:', eventName, '| variant:', variantId, '| tier:', tier, '| email:', email);

  // subscription_created
  if (eventName === 'subscription_created') {
    if (!tier) return res.status(200).send('unknown variant');
    if (variantId === LIFETIME_VARIANT_ID) {
      const count = await prisma.user.count({ where: { tier: 'lifetime' } });
      if (count >= LIFETIME_CAP) {
        console.warn('[LEMON] lifetime cap reached for', email);
        return res.status(200).send('lifetime cap reached');
      }
    }
    if (!email) return res.status(400).send('missing email');
    await upsertUser(email, {
      tier,
      subscriptionStatus: 'active',
      subscriptionType: variantId === LIFETIME_VARIANT_ID ? 'one_time' : 'recurring',
      subscriptionId,
      lemonCustomerId: customerId,
      provider: 'lemonsqueezy',
    });
    return res.status(200).send('ok');
  }

  // subscription_updated (plan change, renewal)
  if (eventName === 'subscription_updated') {
    const status = attrs.status || 'active';
    const newVariantId = String(attrs.variant_id || attrs.first_subscription_item?.variant_id || '');
    const newTier = VARIANT_TIER_MAP[newVariantId] || null;
    if (subscriptionId) {
      try {
        await prisma.user.updateMany({
          where: { subscriptionId },
          data: { subscriptionStatus: status, ...(newTier ? { tier: newTier } : {}) },
        });
      } catch (e) { console.error('[LEMON] subscription_updated error', e.message); }
    }
    return res.status(200).send('ok');
  }

  // subscription_cancelled / expired / paused
  if (['subscription_cancelled','subscription_expired','subscription_paused'].includes(eventName)) {
    if (subscriptionId) {
      try {
        await prisma.user.updateMany({
          where: { subscriptionId },
          data: {
            tier: 'free',
            subscriptionStatus: eventName === 'subscription_paused' ? 'paused' : 'canceled',
            subscriptionType: 'none',
          },
        });
      } catch (e) { console.error('[LEMON]', eventName, 'error', e.message); }
    }
    return res.status(200).send('ok');
  }

  // order_created (lifetime one-time fallback)
  if (eventName === 'order_created' || eventName === 'order_completed') {
    const oVariantId = String(attrs.variant_id || payload.data?.attributes?.first_order_item?.variant_id || '');
    if (oVariantId === LIFETIME_VARIANT_ID) {
      const count = await prisma.user.count({ where: { tier: 'lifetime' } });
      if (count >= LIFETIME_CAP) return res.status(200).send('lifetime cap reached');
      const oEmail = attrs.user_email || attrs.customer_email || email;
      if (oEmail) {
        await upsertUser(oEmail, {
          tier: 'lifetime', subscriptionStatus: 'active', subscriptionType: 'one_time',
          subscriptionId: String(payload.data?.id || ''), lemonCustomerId: customerId, provider: 'lemonsqueezy',
        });
      }
    }
    return res.status(200).send('ok');
  }

  // refund
  if (eventName === 'order_refunded' || eventName === 'refund_created') {
    if (subscriptionId) {
      try {
        await prisma.user.updateMany({
          where: { subscriptionId },
          data: { tier: 'free', subscriptionStatus: 'refunded', subscriptionType: 'none' },
        });
      } catch (e) { console.error('[LEMON] refund error', e.message); }
    }
    return res.status(200).send('ok');
  }

  console.log('[LEMON] unhandled event:', eventName);
  return res.status(200).send('ignored');
});

module.exports = router;
