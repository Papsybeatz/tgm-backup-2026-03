const express    = require('express');
const router     = express.Router();
const requireAuth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes('REPLACE')) return null;
  try {
    return require('stripe')(key);
  } catch (e) {
    console.warn('[BILLING] stripe SDK not available:', e.message);
    return null;
  }
}

const APP_URL = process.env.APP_URL || 'https://www.thegrantsmaster.com';

// GET /api/billing/portal
// Returns a Stripe Customer Portal URL for the authenticated user.
// If the user has no Stripe customer ID (free tier), redirects to /pricing.
router.get('/portal', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Free tier — no billing portal, send to pricing
    if (!user.stripeCustomerId) {
      return res.json({ url: `${APP_URL}/pricing` });
    }

    const stripe = getStripe();
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });

    const session = await stripe.billingPortal.sessions.create({
      customer:   user.stripeCustomerId,
      return_url: `${APP_URL}/dashboard`,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('[BILLING] portal error:', err.message);
    return res.status(500).json({ error: 'Failed to open billing portal' });
  }
});

// GET /api/billing/status
// Returns the current user's tier and subscription status.
router.get('/status', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user.id },
      select: { tier: true, subscriptionStatus: true, subscriptionType: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err) {
    console.error('[BILLING] status error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch billing status' });
  }
});

module.exports = router;
