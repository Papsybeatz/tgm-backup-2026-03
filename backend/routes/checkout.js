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

/** Stripe messages are useful to the buyer's operator, never contain secrets. */
function sanitizeStripeError(err) {
  return String(err?.message || err || 'Unknown checkout error')
    .replace(/sk_[a-zA-Z0-9_]+/g, '[redacted]')
    .slice(0, 300);
}
const FUNDER_PILOT_PRICE_ID = process.env.STRIPE_FUNDER_PILOT_PRICE_ID || 'price_1TxLdP64TrQMI3mIwohgkoSa';
const FUNDER_SCALE_PRICE_ID = process.env.STRIPE_FUNDER_SCALE_PRICE_ID || 'price_1TxLku64TrQMI3mIiFBlby8P';
const FUNDER_ENTERPRISE_PRICE_ID = process.env.STRIPE_FUNDER_ENTERPRISE_PRICE_ID || 'price_1TxLrO64TrQMI3mIKMEbGAvL';

// Built at request time so Railway env vars are always resolved.
//
// This is the ONLY map /create-session may validate against, and it holds
// exactly the user tiers in src/config/tiers.js: starter, pro, agency_starter,
// agency_unlimited, and lifetime (the founding-member deal).
//
// Every sellable tier has TWO prices — monthly and annual — and both map to the
// SAME tier string. An annual buyer therefore gets exactly what a monthly buyer
// gets; only the billing interval differs. The yearly totals themselves live in
// src/config/discounts.js, which is the single source of truth for the amounts.
//
// This map is duplicated in routes/webhooks/stripe.js and routes/auth.js. All
// three must list the annual prices: the webhook map is what actually grants the
// tier, so an annual price missing there would charge the card and grant
// nothing.
//
// Funder prices are deliberately absent. A funder price accepted here would
// store a tier string (`funder_pilot`) that has no entry in src/config/tiers.js,
// so every feature accessor would fall back to TIERS.free and the buyer would
// pay and receive nothing. Funder plans are a separate, cycle-based product
// sold through /create-funder-session.
function getUserPriceTierMap() {
  return {
    // Monthly
    [process.env.STRIPE_STARTER_PRICE_ID]:               'starter',
    [process.env.STRIPE_PRO_PRICE_ID]:                   'pro',
    [process.env.STRIPE_AGENCY_STARTER_PRICE_ID]:        'agency_starter',
    // Annual — the same tiers, billed yearly
    [process.env.STRIPE_STARTER_ANNUAL_PRICE_ID]:        'starter',
    [process.env.STRIPE_PRO_ANNUAL_PRICE_ID]:            'pro',
    [process.env.STRIPE_AGENCY_STARTER_ANNUAL_PRICE_ID]: 'agency_starter',
    // Grandfathered, no longer sold
    [process.env.STRIPE_AGENCY_UNLIMITED_PRICE_ID]:      'agency_unlimited',
    [process.env.STRIPE_LIFETIME_PRICE_ID]:              'lifetime',
  };
}

// Funder plans are not tiers — they are a separate, cycle-based product with
// their own webhook flow and sidecar provisioning. Kept in their own map so
// they can never be mistaken for a user subscription.
function getFunderPriceMap() {
  return {
    [FUNDER_PILOT_PRICE_ID]:      'funder_pilot',
    [FUNDER_SCALE_PRICE_ID]:      'funder_scale',
    [FUNDER_ENTERPRISE_PRICE_ID]: 'funder_enterprise',
  };
}

function normalizeCheckoutPaths(successPath, cancelPath) {
  return {
    successPath: typeof successPath === 'string' && successPath.startsWith('/') ? successPath : '/billing/processing',
    cancelPath: typeof cancelPath === 'string' && cancelPath.startsWith('/') ? cancelPath : '/pricing',
  };
}

function buildSessionParams({ priceId, customerId, userId, checkoutContext, successPath, cancelPath, couponId }) {
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

  // Need-based pricing (70% off for organizations under $300k) is a coupon, not
  // a second set of prices, so it stacks with the annual price without a schema
  // change or a price-ID explosion.
  if (couponId) {
    sessionParams.discounts = [{ coupon: couponId }];
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

  const { priceId, successPath, cancelPath, checkoutContext, needBased } = req.body;
  if (!priceId) return res.status(400).json({ error: 'priceId is required' });

  const normalizedPaths = normalizeCheckoutPaths(successPath, cancelPath);

  // The need-based discount is self-attested at checkout. If it is requested
  // but the coupon is not configured, fail loudly — silently charging full
  // price to an organization that qualifies is worse than not selling.
  let couponId = null;
  if (needBased) {
    couponId = process.env.STRIPE_NEED_BASED_COUPON_ID;
    if (!couponId) {
      console.error('[CHECKOUT] need-based requested but STRIPE_NEED_BASED_COUPON_ID is not set');
      return res.status(503).json({
        error: 'Need-based pricing is not available right now',
        reason: 'need_based_coupon_missing',
      });
    }
  }

  const PRICE_TIER_MAP   = getUserPriceTierMap();

  const tier = PRICE_TIER_MAP[priceId];
  if (!tier) {
    // A funder price arriving here is the failure this split exists to prevent:
    // it would charge the card and grant nothing. Name it explicitly so the log
    // says which mistake was made rather than a bare "unknown price".
    if (getFunderPriceMap()[priceId]) {
      console.error('[CHECKOUT] Funder price submitted to create-session:', priceId);
      return res.status(400).json({
        error: 'Funder plans are not sold through this endpoint',
        reason: 'funder_price_on_user_checkout',
      });
    }
    console.error('[CHECKOUT] Unknown priceId:', priceId, '| Known IDs:', Object.keys(PRICE_TIER_MAP));
    return res.status(400).json({ error: 'Unknown price ID' });
  }

  // Founding Member is a capped launch instrument: the scarcity is what makes
  // the urgency real, and the cap is what bounds the liability.
  if (tier === 'lifetime') {
    const FOUNDING_MEMBER_SEATS = Number(process.env.FOUNDING_MEMBER_SEATS || 100);
    try {
      const claimed = await prisma.user.count({ where: { tier: 'lifetime' } });
      if (claimed >= FOUNDING_MEMBER_SEATS) {
        return res.status(409).json({
          error: 'Founding Member seats are all claimed',
          reason: 'founding_member_sold_out',
          seatsClaimed: claimed,
          seatLimit: FOUNDING_MEMBER_SEATS,
          message: `All ${FOUNDING_MEMBER_SEATS} Founding Member seats have been claimed. Starter is $29/month.`,
        });
      }
    } catch (e) {
      // Never block a sale because the count failed; the webhook still records it.
      console.warn('[CHECKOUT] could not count lifetime seats:', e?.message || e);
    }
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Already a Founding Member — nothing to buy.
    if (tier === 'lifetime' && user.tier === 'lifetime') {
      return res.status(409).json({ error: 'You are already a Founding Member' });
    }

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
      couponId,
    });

    const session = await stripe.checkout.sessions.create(sessionParams);
    return res.json({ url: session.url });
  } catch (err) {
    console.error('[CHECKOUT] create-session error:', err.message);
    // The Stripe reason was only ever in the logs, so a failure like a price
    // belonging to another account looked identical to a network blip.
    return res.status(500).json({
      error: 'Failed to create checkout session',
      detail: sanitizeStripeError(err),
      priceId,
      hint: /no such price/i.test(err.message || '')
        ? 'This price belongs to a different Stripe account than the live key. Recreate it in the same account.'
        : undefined,
    });
  }
});

router.post('/create-funder-session', async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    console.error('[CHECKOUT] STRIPE_SECRET_KEY not set. Value:', process.env.STRIPE_SECRET_KEY ? 'present' : 'MISSING');
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const {
    leadId,
    priceId,
    cycleName,
    cycleYear,
    applicationsAllowed,
    successPath,
    cancelPath,
  } = req.body;

  if (!leadId) return res.status(400).json({ error: 'leadId is required' });
  if (!priceId) return res.status(400).json({ error: 'priceId is required' });
  if (!cycleName) return res.status(400).json({ error: 'cycleName is required' });
  if (!cycleYear) return res.status(400).json({ error: 'cycleYear is required' });

  const FUNDER_PRICE_MAP = getFunderPriceMap();
  const planKey = FUNDER_PRICE_MAP[priceId];
  if (!planKey) {
    // Mirror of the guard in /create-session: a user tier price reaching the
    // funder route is a wiring mistake, so say which one it was.
    const isUserPrice = Boolean(getUserPriceTierMap()[priceId]);
    console.error('[CHECKOUT] Non-funder priceId submitted to create-funder-session:', priceId);
    return res.status(400).json({
      error: isUserPrice
        ? 'Funder checkout only supports funder plan prices'
        : 'Unknown price ID',
      reason: isUserPrice ? 'user_price_on_funder_checkout' : 'unknown_price',
    });
  }

  const normalizedYear = Number(cycleYear);
  const allowedCount = Number(applicationsAllowed) || (planKey === 'funder_pilot' ? 50 : 500);
  const normalizedPaths = normalizeCheckoutPaths(successPath, cancelPath);

  try {
    // Verify the lead exists and is approved
    const lead = await prisma.funderLead.findUnique({ where: { id: leadId } });
    if (!lead) return res.status(404).json({ error: 'Funder lead not found' });
    if (!['approved', 'sandbox_issued', 'production_active'].includes(lead.status)) {
      return res.status(403).json({ error: 'Your account is not yet approved. Complete the application first.' });
    }

    // Prevent duplicate active cycles
    const existingCycle = await prisma.funderCycle.findUnique({
      where: { funderLeadId_cycleName_cycleYear: { funderLeadId: leadId, cycleName, cycleYear: normalizedYear } },
    });
    if (existingCycle && existingCycle.status === 'active') {
      return res.status(409).json({ error: `Cycle "${cycleName} ${normalizedYear}" is already active.` });
    }

    // Create or reuse a pending cycle record
    let cycle;
    if (existingCycle && existingCycle.status === 'pending_payment') {
      cycle = existingCycle;
    } else {
      cycle = await prisma.funderCycle.create({
        data: {
          funderLeadId: leadId,
          cycleName,
          cycleYear: normalizedYear,
          planKey,
          status: 'pending_payment',
          applicationsAllowed: allowedCount,
          stripePriceId: priceId,
        },
      });
    }

    // Build Stripe session with full cycle metadata so the webhook can activate
    const sessionParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        checkout_context: 'funder_cycle',
        funder_lead_id: leadId,
        funder_cycle_id: cycle.id,
        cycle_name: cycleName,
        cycle_year: String(normalizedYear),
        plan_key: planKey,
        applications_allowed: String(allowedCount),
      },
      customer_email: lead.email,
      success_url: `${APP_URL}${normalizedPaths.successPath}?cycle=${cycle.id}`,
      cancel_url: `${APP_URL}${normalizedPaths.cancelPath}`,
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Store checkout session ID on the cycle record
    await prisma.funderCycle.update({
      where: { id: cycle.id },
      data: { stripeCheckoutSessionId: session.id },
    });

    return res.json({ url: session.url, cycleId: cycle.id });
  } catch (err) {
    console.error('[CHECKOUT] create-funder-session error:', err.message);
    return res.status(500).json({
      error: 'Failed to create checkout session',
      detail: sanitizeStripeError(err),
    });
  }
});

// ── GET /api/checkout/prices ───────────────────────────────────────────────────
// Returns the price IDs and publishable key to the frontend.
// No auth required — public endpoint.
router.get('/prices', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    prices: {
      // User tiers — these are the only prices /create-session will accept.
      starter:          process.env.STRIPE_STARTER_PRICE_ID,
      pro:              process.env.STRIPE_PRO_PRICE_ID,
      agency_starter:   process.env.STRIPE_AGENCY_STARTER_PRICE_ID,
      agency_unlimited: process.env.STRIPE_AGENCY_UNLIMITED_PRICE_ID,
      lifetime:         process.env.STRIPE_LIFETIME_PRICE_ID,
      // Annual prices for the Monthly/Annual toggle. An entry missing here has
      // no annual price configured yet, and the page must fall back to
      // monthly-only rather than offer a plan the checkout will reject with a
      // 400. JSON.stringify drops undefined, so an unset var simply vanishes.
      annual: {
        starter:        process.env.STRIPE_STARTER_ANNUAL_PRICE_ID,
        pro:            process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
        agency_starter: process.env.STRIPE_AGENCY_STARTER_ANNUAL_PRICE_ID,
      },
      // Lets the page hide the need-based checkbox instead of offering a
      // discount the server will answer with 503.
      needBasedAvailable: Boolean(process.env.STRIPE_NEED_BASED_COUPON_ID),
      // Funder plans, for the funder landing page. They must be sent to
      // /create-funder-session, never to /create-session.
      funder: {
        pilot: FUNDER_PILOT_PRICE_ID,
        scale: FUNDER_SCALE_PRICE_ID,
        enterprise: FUNDER_ENTERPRISE_PRICE_ID,
      },
    },
  });
});

module.exports = router;
// Exported for tests: keeping funder prices out of the user checkout is a
// correctness property, not an implementation detail, so it is asserted rather
// than trusted.
module.exports.getUserPriceTierMap = getUserPriceTierMap;
module.exports.getFunderPriceMap = getFunderPriceMap;
