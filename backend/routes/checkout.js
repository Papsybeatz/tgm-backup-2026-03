const express    = require('express');
const router     = express.Router();
const requireAuth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Initialise lazily so Railway env vars are always read at request time
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes('REPLACE')) return null;
  try {
    return require('stripe')(key);
  } catch (e) {
    console.warn('[CHECKOUT] stripe SDK not available:', e.message);
    return null;
  }
}

const APP_URL = process.env.APP_URL || 'https://www.thegrantsmaster.com';
const FUNDER_PILOT_PRICE_ID = process.env.STRIPE_FUNDER_PILOT_PRICE_ID || 'price_1TxLdP64TrQMI3mIwohgkoSa';
const FUNDER_SCALE_PRICE_ID = process.env.STRIPE_FUNDER_SCALE_PRICE_ID || 'price_1TxLku64TrQMI3mIiFBlby8P';
const FUNDER_ENTERPRISE_PRICE_ID = process.env.STRIPE_FUNDER_ENTERPRISE_PRICE_ID || 'price_1TxLrO64TrQMI3mIKMEbGAvL';

// Built at request time so Railway env vars are always resolved
function getPriceTierMap() {
  return {
    [process.env.STRIPE_STARTER_PRICE_ID]:          'starter',
    [process.env.STRIPE_PRO_PRICE_ID]:              'pro',
    [process.env.STRIPE_ANNUAL_PRO_PRICE_ID]:       'pro',
    [process.env.STRIPE_AGENCY_STARTER_PRICE_ID]:   'agency_starter',
    [process.env.STRIPE_AGENCY_UNLIMITED_PRICE_ID]: 'agency_unlimited',
    [process.env.STRIPE_LIFETIME_PRICE_ID]:         'lifetime',
    [FUNDER_PILOT_PRICE_ID]:                         'funder_pilot',
    [FUNDER_SCALE_PRICE_ID]:                         'funder_scale',
    [FUNDER_ENTERPRISE_PRICE_ID]:                    'funder_enterprise',
  };
}

function normalizeCheckoutPaths(successPath, cancelPath) {
  return {
    successPath: typeof successPath === 'string' && successPath.startsWith('/') ? successPath : '/billing/processing',
    cancelPath: typeof cancelPath === 'string' && cancelPath.startsWith('/') ? cancelPath : '/pricing',
  };
}

function buildSessionParams({ priceId, customerId, userId, checkoutContext, successPath, cancelPath }) {
  const LIFETIME_PRICE_ID = process.env.STRIPE_LIFETIME_PRICE_ID;
  const isLifetime = priceId === LIFETIME_PRICE_ID;

  const sessionParams = {
    mode: isLifetime ? 'payment' : 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      price_id: priceId,
      checkout_context: String(checkoutContext || 'app'),
    },
    success_url: `${APP_URL}${successPath}`,
    cancel_url: `${APP_URL}${cancelPath}`,
  };

  if (customerId) {
    sessionParams.customer = customerId;
  }

  if (userId) {
    sessionParams.metadata.user_id = String(userId);
  }

  if (!isLifetime) {
    sessionParams.subscription_data = {
      metadata: {
        price_id: priceId,
        checkout_context: String(checkoutContext || 'app'),
      },
    };
    if (userId) {
      sessionParams.subscription_data.metadata.user_id = String(userId);
    }
  }

  return sessionParams;
}

// ── POST /api/checkout/create-session ─────────────────────────────────────────
// Creates a Stripe Checkout session and returns the hosted URL.
// Requires auth so we can attach the user's email to the session.
router.post('/create-session', requireAuth, async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    console.error('[CHECKOUT] STRIPE_SECRET_KEY not set. Value:', process.env.STRIPE_SECRET_KEY ? 'present' : 'MISSING');
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const { priceId, successPath, cancelPath, checkoutContext } = req.body;
  if (!priceId) return res.status(400).json({ error: 'priceId is required' });

  const normalizedPaths = normalizeCheckoutPaths(successPath, cancelPath);

  const PRICE_TIER_MAP   = getPriceTierMap();

  const tier = PRICE_TIER_MAP[priceId];
  if (!tier) {
    console.error('[CHECKOUT] Unknown priceId:', priceId, '| Known IDs:', Object.keys(PRICE_TIER_MAP));
    return res.status(400).json({ error: 'Unknown price ID' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: String(user.id) },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId, provider: 'stripe' },
      });
    }

    const sessionParams = buildSessionParams({
      priceId,
      customerId,
      userId: user.id,
      checkoutContext,
      successPath: normalizedPaths.successPath,
      cancelPath: normalizedPaths.cancelPath,
    });

    const session = await stripe.checkout.sessions.create(sessionParams);
    return res.json({ url: session.url });
  } catch (err) {
    console.error('[CHECKOUT] create-session error:', err.message);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

router.post('/create-funder-session', async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    console.error('[CHECKOUT] STRIPE_SECRET_KEY not set. Value:', process.env.STRIPE_SECRET_KEY ? 'present' : 'MISSING');
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const { priceId, successPath, cancelPath, checkoutContext } = req.body;
  if (!priceId) return res.status(400).json({ error: 'priceId is required' });

  const PRICE_TIER_MAP = getPriceTierMap();
  const tier = PRICE_TIER_MAP[priceId];
  if (!tier) {
    console.error('[CHECKOUT] Unknown funder priceId:', priceId);
    return res.status(400).json({ error: 'Unknown price ID' });
  }
  if (!tier.startsWith('funder_')) {
    return res.status(400).json({ error: 'Funder checkout only supports funder plan prices' });
  }

  const normalizedPaths = normalizeCheckoutPaths(successPath, cancelPath);

  try {
    const sessionParams = buildSessionParams({
      priceId,
      checkoutContext: checkoutContext || 'funder_api',
      successPath: normalizedPaths.successPath,
      cancelPath: normalizedPaths.cancelPath,
    });
    const session = await stripe.checkout.sessions.create(sessionParams);
    return res.json({ url: session.url });
  } catch (err) {
    console.error('[CHECKOUT] create-funder-session error:', err.message);
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
      annual_pro:       process.env.STRIPE_ANNUAL_PRO_PRICE_ID,
      agency_starter:   process.env.STRIPE_AGENCY_STARTER_PRICE_ID,
      agency_unlimited: process.env.STRIPE_AGENCY_UNLIMITED_PRICE_ID,
      lifetime:         process.env.STRIPE_LIFETIME_PRICE_ID,
      funder: {
        pilot: FUNDER_PILOT_PRICE_ID,
        scale: FUNDER_SCALE_PRICE_ID,
        enterprise: FUNDER_ENTERPRISE_PRICE_ID,
      },
    },
  });
});

module.exports = router;
