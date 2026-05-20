const express    = require('express');
const router     = express.Router();
const requireAuth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

let stripe = null;
try {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
} catch (e) {
  console.warn('[CHECKOUT] stripe SDK not available:', e.message);
}

// Price ID → tier key (mirrors webhook handler)
const PRICE_TIER_MAP = {
  [process.env.STRIPE_STARTER_PRICE_ID]:          'starter',
  [process.env.STRIPE_PRO_PRICE_ID]:              'pro',
  [process.env.STRIPE_AGENCY_STARTER_PRICE_ID]:   'agency_starter',
  [process.env.STRIPE_AGENCY_UNLIMITED_PRICE_ID]: 'agency_unlimited',
  [process.env.STRIPE_LIFETIME_PRICE_ID]:         'lifetime',
};

const LIFETIME_PRICE_ID = process.env.STRIPE_LIFETIME_PRICE_ID;
const APP_URL = process.env.APP_URL || 'https://www.thegrantsmaster.com';

// ── POST /api/checkout/create-session ─────────────────────────────────────────
// Creates a Stripe Checkout session and returns the hosted URL.
// Requires auth so we can attach the user's email to the session.
router.post('/create-session', requireAuth, async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });

  const { priceId } = req.body;
  if (!priceId) return res.status(400).json({ error: 'priceId is required' });

  const tier = PRICE_TIER_MAP[priceId];
  if (!tier) return res.status(400).json({ error: 'Unknown price ID' });

  const isLifetime = priceId === LIFETIME_PRICE_ID;

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const sessionParams = {
      mode:                isLifetime ? 'payment' : 'subscription',
      payment_method_types: ['card'],
      customer_email:      user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      // Pass price_id in metadata so the webhook can resolve the tier
      metadata: { price_id: priceId, user_id: String(user.id) },
      success_url: `${APP_URL}/dashboard?checkout=success&tier=${tier}`,
      cancel_url:  `${APP_URL}/pricing?checkout=cancelled`,
    };

    // For subscriptions, also embed metadata on the subscription object
    if (!isLifetime) {
      sessionParams.subscription_data = {
        metadata: { price_id: priceId, user_id: String(user.id) },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return res.json({ url: session.url });
  } catch (err) {
    console.error('[CHECKOUT] create-session error:', err.message);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// ── GET /api/checkout/prices ───────────────────────────────────────────────────
// Returns the price IDs and publishable key to the frontend.
// No auth required — public endpoint.
router.get('/prices', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    prices: {
      starter:          process.env.STRIPE_STARTER_PRICE_ID,
      pro:              process.env.STRIPE_PRO_PRICE_ID,
      agency_starter:   process.env.STRIPE_AGENCY_STARTER_PRICE_ID,
      agency_unlimited: process.env.STRIPE_AGENCY_UNLIMITED_PRICE_ID,
      lifetime:         process.env.STRIPE_LIFETIME_PRICE_ID,
    },
  });
});

module.exports = router;
