const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/roleAuth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

let stripe = null;
try {
  stripe = require('stripe')(process.env.STRIPE_API_KEY);
} catch (e) {
  console.warn('[CHECKOUT] stripe SDK not installed or STRIPE_API_KEY missing');
}

// Create a Stripe Checkout session and persist stripeCustomerId to user
router.post('/create-session', express.json(), async (req, res) => {
  if (!stripe) return res.status(500).json({ success: false, message: 'Stripe not configured' });
  const { tier, successUrl, cancelUrl, token } = req.body;

  // Resolve user: prefer req.user (if middleware set it), else use token or Authorization header
  let user = req.user;
  try {
    if (!user) {
      const authHeader = req.headers.authorization;
      const sessionToken = token || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null);
      if (!sessionToken) return res.status(401).json({ success: false, message: 'Authentication required' });
      const session = await prisma.session.findUnique({ where: { token: sessionToken } });
      if (!session) return res.status(401).json({ success: false, message: 'Session not found or expired' });
      const dbUser = await prisma.user.findUnique({ where: { email: session.email } });
      if (!dbUser) return res.status(404).json({ success: false, message: 'User not found' });
      user = { email: dbUser.email, tier: dbUser.tier };
    }
  } catch (e) {
    console.error('[CHECKOUT] auth lookup error', e);
    return res.status(500).json({ success: false, message: 'Auth lookup failed' });
  }
  if (!user || !user.email) return res.status(400).json({ success: false, message: 'User email required' });

  try {
    // Create or retrieve customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customer;
    if (customers.data && customers.data.length) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create({ email: user.email });
    }

    // Ensure Prisma user exists and has current tier, then persist stripeCustomerId
    try {
      const randomPass = require('crypto').randomBytes(16).toString('hex');
      await prisma.user.upsert({
        where: { email: user.email },
        update: { tier: user.tier || 'free', stripeCustomerId: customer.id },
        create: { email: user.email, password: randomPass, tier: user.tier || 'free', stripeCustomerId: customer.id }
      });
    } catch (pe) {
      console.error('[CHECKOUT] prisma upsert error:', pe);
    }

    // Map tier to price id
    const priceMap = {
      starter: process.env.STRIPE_STARTER_PRICE_ID,
      pro: process.env.STRIPE_PRO_PRICE_ID,
      agency_starter: process.env.STRIPE_AGENCY_STARTER_PRICE_ID,
      agency_unlimited: process.env.STRIPE_AGENCY_UNLIMITED_PRICE_ID,
      lifetime: process.env.STRIPE_LIFETIME_PRICE_ID
    };
    const priceId = priceMap[tier];
    if (!priceId) return res.status(400).json({ success: false, message: 'Unknown tier' });

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      success_url: successUrl || `${process.env.APP_URL}/dashboard?success=true&plan=${tier}`,
      cancel_url: cancelUrl || `${process.env.APP_URL}/pricing?cancel=true&plan=${tier}`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[CHECKOUT] error creating session', err);
    res.status(500).json({ success: false, message: 'Checkout creation failed' });
  }
});

module.exports = router;
