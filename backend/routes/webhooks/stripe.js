const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Map of stripe price id -> tier key
const PRICE_MAP = {
  [process.env.STRIPE_STARTER_PRICE_ID || 'price_starter']: 'starter',
  [process.env.STRIPE_PRO_PRICE_ID || 'price_pro']: 'pro',
  [process.env.STRIPE_AGENCY_STARTER_PRICE_ID || 'price_agency_starter']: 'agency_starter',
  [process.env.STRIPE_AGENCY_UNLIMITED_PRICE_ID || 'price_agency_unlimited']: 'agency_unlimited'
};

router.post('/stripe-webhook', express.json({ type: 'application/json' }), async (req, res) => {
  const event = req.body;
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const priceId = session?.metadata?.price_id || session?.line_items?.[0]?.price?.id;
        const tierKey = PRICE_MAP[priceId];
        if (!tierKey) return res.status(200).send('no tier mapped');
        if (!session.customer_email) return res.status(400).send('missing customer email');
        await prisma.user.update({
          where: { email: session.customer_email },
          data: {
            tier: tierKey,
            subscriptionStatus: 'active',
            subscriptionType: 'recurring',
            subscriptionId: session.subscription || null,
            provider: 'stripe'
          }
        });
        return res.status(200).send('ok');
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        await prisma.user.updateMany({ where: { subscriptionId: sub.id }, data: { subscriptionStatus: sub.status } });
        return res.status(200).send('ok');
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await prisma.user.updateMany({ where: { subscriptionId: sub.id }, data: { tier: 'free', subscriptionStatus: 'canceled', subscriptionType: 'none' } });
        return res.status(200).send('ok');
      }

      default:
        return res.status(200).send('ignored');
    }
  } catch (e) {
    console.error('[STRIPE WEBHOOK] handler error', e);
    return res.status(500).send('handler error');
  }
});

module.exports = router;
