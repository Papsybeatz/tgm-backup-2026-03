// backend/routes/auth.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { generateSessionToken, getSessionExpiry } = require('../utils/session');
const { sanitizeInput, validateEmail } = require('../utils/sanitize');

const prisma = new PrismaClient();
const router = express.Router();
const STRIPE_PAID_TIERS = new Set(['starter', 'pro', 'agency_starter', 'agency_unlimited']);
const MANUAL_COMP_PROVIDER = 'manual_comp';
const MANUAL_COMP_TYPE = 'manual_comp';

function databaseReady(res) {
  if (process.env.DATABASE_URL) return true;
  res.status(503).json({
    success: false,
    code: 'DATABASE_NOT_CONFIGURED',
    message: 'Login is temporarily unavailable because the backend database is not configured.',
  });
  return false;
}

function handleAuthError(res, error) {
  console.error('[AUTH] request failed:', error);
  if (res.headersSent) return;
  res.status(500).json({
    success: false,
    message: 'Authentication service error. Please try again.',
  });
}

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes('REPLACE')) return null;
  try { return require('stripe')(key); }
  catch (error) {
    console.warn('[AUTH] stripe SDK not available:', error.message);
    return null;
  }
}

async function logAuthBillingEvent(userId, message) {
  try {
    await prisma.errorLog.create({
      data: {
        message,
        endpoint: 'auth-login',
        userId,
        severity: 'warning',
      },
    });
  } catch (error) {
    console.warn('[AUTH] could not log billing event:', error.message);
  }
}

async function validateStripeEntitlement(user) {
  if (!user || !STRIPE_PAID_TIERS.has(user.tier)) return user;

  const downgrade = async (reason) => {
    await logAuthBillingEvent(user.id, `Auto-downgrade: ${reason}`);
    return prisma.user.update({
      where: { id: user.id },
      data: {
        tier: 'free',
        subscriptionStatus: 'inactive',
        subscriptionType: 'none',
        subscriptionId: null,
        currentPeriodEnd: null,
        provider: 'stripe',
      },
    });
  };

  if (user.provider === MANUAL_COMP_PROVIDER && user.subscriptionType === MANUAL_COMP_TYPE) {
    if (user.currentPeriodEnd && new Date(user.currentPeriodEnd) > new Date()) return user;
    return downgrade('manual comp expired');
  }

  if (!user.stripeCustomerId) return downgrade('invalid subscription (missing stripe customer)');

  const stripe = getStripe();
  if (!stripe) {
    console.warn('[AUTH] Stripe unavailable; entitlement verification skipped.');
    return user;
  }

  try {
    if (user.subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(user.subscriptionId);
      if (['active', 'trialing'].includes(subscription.status)) {
        return user;
      }
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'all',
      limit: 10,
    });
    const active = subscriptions.data.find((subscription) => ['active', 'trialing'].includes(subscription.status));
    if (active) {
      return prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionId: active.id,
          subscriptionStatus: active.status,
          currentPeriodEnd: active.current_period_end ? new Date(active.current_period_end * 1000) : user.currentPeriodEnd,
          provider: 'stripe',
        },
      });
    }

    return downgrade('invalid subscription (no active stripe subscription)');
  } catch (error) {
    console.error('[AUTH] Stripe entitlement verification failed:', error.message);
    return downgrade('invalid subscription (stripe verification failed)');
  }
}

function validateCredentialsInput(req, res) {
  const email = sanitizeInput(req.body.email);
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!validateEmail(email)) {
    res.status(400).json({ success: false, message: 'Invalid email.' });
    return null;
  }
  if (password.length < 6) {
    res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    return null;
  }
  return { email, password };
}

async function createSession(res, user) {
  const token = generateSessionToken();
  const expiresAt = getSessionExpiry();
  await prisma.session.create({
    data: {
      token,
      email: user.email,
      createdAt: new Date(),
      expiresAt: new Date(expiresAt),
    },
  });
  try {
    const maxAge = new Date(expiresAt).getTime() - Date.now();
    res.cookie('session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge });
  } catch (e) {
    // ignore cookie set errors
  }
  return token;
}

function publicUserPayload(user, token) {
  return {
    id: user.id,
    token,
    email: user.email,
    name: user.name,
    role: user.role,
    tier: user.tier,
    onboardingCompleted: user.onboardingCompleted,
    onboardingData: user.onboardingData,
    audienceRole: user.audienceRole,
    location: user.location,
    workspaceMode: user.workspaceMode,
    pricingRecommendation: user.pricingRecommendation,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function deriveOnboardingProfile(input) {
  const role = input.role || '';
  const state = input.state || '';
  const grantVolume = input.grantVolume || '';
  const urgency = input.urgency || '';
  const painPoints = Array.isArray(input.painPoints) ? input.painPoints : [];
  const primaryFunderTypes = Array.isArray(input.primaryFunderTypes) ? input.primaryFunderTypes : [];

  const nyMode = state === 'NY' || primaryFunderTypes.includes('ny_funders');
  const consultantMode = role === 'consultant' || painPoints.includes('managing_clients');
  const agencyMode = role === 'agency';
  const workspaceMode = agencyMode ? 'agency' : consultantMode ? 'consultant' : nyMode ? 'new_york' : 'standard';
  const highVolume = ['10_25', '25_plus'].includes(grantVolume);
  const pricingRecommendation = grantVolume === '25_plus'
    ? 'agency_unlimited'
    : agencyMode || consultantMode || highVolume
      ? 'agency_starter'
      : grantVolume === '3_10'
        ? 'pro'
        : 'starter';

  return {
    ...input,
    nyMode,
    consultantMode,
    agencyMode,
    workspaceMode,
    pricingRecommendation,
    postOnboardingCta: urgency === 'deadline' ? 'start_draft_now' : 'open_dashboard',
    stevePromptSet: {
      sector: input.sector || 'general',
      funderTypes: primaryFunderTypes,
      role,
      urgency,
    },
    checkmateRules: {
      stateAware: Boolean(state),
      nyAware: nyMode,
      sectorAware: Boolean(input.sector),
      funderAware: primaryFunderTypes.length > 0,
    },
  };
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    if (!databaseReady(res)) return;
    const credentials = validateCredentialsInput(req, res);
    if (!credentials) return;

    const existingUser = await prisma.user.findUnique({ where: { email: credentials.email } });
    if (existingUser) return res.status(409).json({ success: false, message: 'An account already exists for this email.' });

    const passwordHash = await bcrypt.hash(credentials.password, 12);
    const user = await prisma.user.create({
      data: {
        email: credentials.email,
        password: passwordHash,
        tier: 'free',
      },
    });
    const token = await createSession(res, user);
    res.status(201).json(publicUserPayload(user, token));
  } catch (error) {
    handleAuthError(res, error);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    if (!databaseReady(res)) return;
    const credentials = validateCredentialsInput(req, res);
    if (!credentials) return;

    const user = await prisma.user.findUnique({ where: { email: credentials.email } });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    const passwordMatches = await bcrypt.compare(credentials.password, user.password);
    if (!passwordMatches) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    await prisma.user.update({ where: { email: user.email }, data: { tier: user.tier } });
    const freshUser = await prisma.user.findUnique({ where: { email: user.email } });
    const verifiedUser = await validateStripeEntitlement(freshUser);
    const token = await createSession(res, verifiedUser);
    res.json(publicUserPayload(verifiedUser, token));
  } catch (error) {
    handleAuthError(res, error);
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    if (!databaseReady(res)) return;
    const token = req.body.token;
    if (!token) return res.status(400).json({ success: false, message: 'Missing token.' });
    await prisma.session.deleteMany({ where: { token } });
    res.json({ success: true });
  } catch (error) {
    handleAuthError(res, error);
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    if (!databaseReady(res)) return;
    // Accept Bearer token or HTTP-only cookie named 'session'
    let token = null;
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) token = auth.replace('Bearer ', '');
    if (!token && req.cookies && req.cookies.session) token = req.cookies.session;
    if (!token) return res.status(401).json({ success: false, message: 'Missing or invalid token.' });
    const session = await prisma.session.findUnique({ where: { token } });
    if (!session || new Date() > session.expiresAt) return res.status(401).json({ success: false, message: 'Session expired.' });
    let user = await prisma.user.findUnique({ where: { email: session.email } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    user = await validateStripeEntitlement(user);
    res.json({
      id:                 user.id,
      email:              user.email,
      name:               user.name,
      role:               user.role,
      tier:               user.tier,
      onboardingCompleted: user.onboardingCompleted,
      onboardingData:     user.onboardingData,
      audienceRole:       user.audienceRole,
      location:           user.location,
      workspaceMode:      user.workspaceMode,
      pricingRecommendation: user.pricingRecommendation,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionType:   user.subscriptionType,
      currentPeriodEnd:   user.currentPeriodEnd,
      createdAt:          user.createdAt,
      updatedAt:          user.updatedAt,
    });
  } catch (error) {
    handleAuthError(res, error);
  }
});

router.post('/onboarding', async (req, res) => {
  try {
    if (!databaseReady(res)) return;
    let token = null;
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) token = auth.replace('Bearer ', '');
    if (!token && req.cookies && req.cookies.session) token = req.cookies.session;
    if (!token) return res.status(401).json({ success: false, message: 'Missing or invalid token.' });

    const session = await prisma.session.findUnique({ where: { token } });
    if (!session || new Date() > session.expiresAt) return res.status(401).json({ success: false, message: 'Session expired.' });
    const user = await prisma.user.findUnique({ where: { email: session.email } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const profile = deriveOnboardingProfile(req.body || {});
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        onboardingCompleted: true,
        onboardingData: profile,
        audienceRole: profile.role || null,
        location: profile.nyMode ? 'new_york' : profile.state || null,
        workspaceMode: profile.workspaceMode,
        pricingRecommendation: profile.pricingRecommendation,
      },
    });

    res.json({ success: true, user: publicUserPayload(updated, token), profile });
  } catch (error) {
    handleAuthError(res, error);
  }
});

module.exports = router;
