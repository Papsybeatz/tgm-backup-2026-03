// backend/routes/auth.js
const express = require('express');
const crypto = require('crypto');
const https = require('https');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { generateSessionToken, getSessionExpiry } = require('../utils/session');
const { sanitizeInput, validateEmail } = require('../utils/sanitize');
const { passwordResetLimiter } = require('../middleware/rateLimit');

const prisma = new PrismaClient();
const router = express.Router();
const STRIPE_PAID_TIERS = new Set(['starter', 'pro', 'agency_starter', 'agency_unlimited']);
const MANUAL_COMP_PROVIDER = 'manual_comp';
const MANUAL_COMP_TYPE = 'manual_comp';
const PREVIEW_PROVIDER = 'preview';
const APP_URL = process.env.APP_URL || 'https://www.thegrantsmaster.com';
const PASSWORD_RESET_TTL_MINUTES = 30;
const PASSWORD_RESET_TOKEN_PREFIX = 'pwdreset_';
const FUNDER_PILOT_PRICE_ID = process.env.STRIPE_FUNDER_PILOT_PRICE_ID || 'price_1TxLdP64TrQMI3mIwohgkoSa';
const FUNDER_SCALE_PRICE_ID = process.env.STRIPE_FUNDER_SCALE_PRICE_ID || 'price_1TxLku64TrQMI3mIiFBlby8P';
const FUNDER_ENTERPRISE_PRICE_ID = process.env.STRIPE_FUNDER_ENTERPRISE_PRICE_ID || 'price_1TxLrO64TrQMI3mIKMEbGAvL';

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

function normalizeEmail(input) {
  return String(input || '').trim().toLowerCase();
}

function getPriceTierMap() {
  return {
    [process.env.STRIPE_STARTER_PRICE_ID]: 'starter',
    [process.env.STRIPE_PRO_PRICE_ID]: 'pro',
    [process.env.STRIPE_ANNUAL_PRO_PRICE_ID]: 'pro',
    [process.env.STRIPE_AGENCY_STARTER_PRICE_ID]: 'agency_starter',
    [process.env.STRIPE_AGENCY_UNLIMITED_PRICE_ID]: 'agency_unlimited',
    [process.env.STRIPE_LIFETIME_PRICE_ID]: 'lifetime',
    [FUNDER_PILOT_PRICE_ID]: 'funder_pilot',
    [FUNDER_SCALE_PRICE_ID]: 'funder_scale',
    [FUNDER_ENTERPRISE_PRICE_ID]: 'funder_enterprise',
  };
}

function tierForStripePrice(priceId) {
  if (!priceId) return null;
  return getPriceTierMap()[priceId] || null;
}

async function findUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const exact = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (exact) return exact;

  try {
    return await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });
  } catch {
    return prisma.user.findFirst({ where: { email: normalizedEmail } });
  }
}

async function sendPasswordResetEmail(email, resetLink) {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.BREVO_FROM_EMAIL || 'noreply@thegrantsmaster.com';
  const fromName = process.env.BREVO_FROM_NAME || 'The Grants Master';

  if (!apiKey) {
    console.log(`[EMAIL STUB] Password reset for ${email}: ${resetLink}`);
    return true;
  }

  const payload = JSON.stringify({
    sender: { name: fromName, email: from },
    to: [{ email }],
    subject: 'Reset your TGM password',
    htmlContent: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;background:#F7F9FB;padding:32px 24px;">
        <div style="background:#0A0F1A;border-radius:14px;padding:28px;text-align:center;margin-bottom:20px;">
          <div style="color:#D4AF37;font-size:18px;font-weight:800;margin-bottom:8px;">The Grants Master</div>
          <h1 style="color:#fff;font-size:24px;line-height:1.25;margin:0;">Reset your password</h1>
        </div>
        <div style="background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:28px;">
          <p style="color:#1A202C;font-size:15px;line-height:1.6;margin:0 0 20px;">
            We received a request to reset your TGM password. This link expires in ${PASSWORD_RESET_TTL_MINUTES} minutes.
          </p>
          <a href="${resetLink}" style="display:block;text-align:center;background:#D4AF37;color:#0A0F1A;border-radius:10px;padding:14px 20px;font-weight:800;text-decoration:none;">
            Reset Password
          </a>
          <p style="color:#64748B;font-size:12px;line-height:1.5;margin:20px 0 0;">
            If you did not request this, you can ignore this email.
          </p>
        </div>
      </div>
    `,
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (response) => {
      let body = '';
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(true);
        } else {
          console.error('[AUTH] Brevo password reset error:', response.statusCode, body);
          reject(new Error('Failed to send password reset email'));
        }
      });
    });
    req.setTimeout(10000, () => req.destroy(new Error('Brevo request timed out')));
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function createPasswordResetSession(user) {
  const now = new Date();
  await prisma.session.deleteMany({
    where: {
      OR: [
        { email: user.email, token: { startsWith: PASSWORD_RESET_TOKEN_PREFIX } },
        { token: { startsWith: PASSWORD_RESET_TOKEN_PREFIX }, expiresAt: { lte: now } },
      ],
    },
  });

  const token = `${PASSWORD_RESET_TOKEN_PREFIX}${crypto.randomBytes(32).toString('hex')}`;
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
  await prisma.session.create({
    data: {
      token,
      email: user.email,
      expiresAt,
    },
  });
  return token;
}

async function getValidPasswordResetSession(token) {
  if (!token || !token.startsWith(PASSWORD_RESET_TOKEN_PREFIX)) return null;
  const session = await prisma.session.findUnique({ where: { token } });
  if (!session || new Date() > session.expiresAt) return null;
  return session;
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
  if (process.env.NODE_ENV !== 'production' && user.provider === PREVIEW_PROVIDER) return user;

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
        const priceId = subscription.items?.data?.[0]?.price?.id || null;
        const currentTier = tierForStripePrice(priceId);
        if (!currentTier) return downgrade(`invalid subscription (unrecognized stripe price ${priceId || 'missing'})`);
        if (currentTier !== user.tier) {
          return prisma.user.update({
            where: { id: user.id },
            data: {
              tier: currentTier,
              subscriptionStatus: subscription.status,
              currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : user.currentPeriodEnd,
              provider: 'stripe',
            },
          });
        }
        return user;
      }
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'all',
      limit: 10,
    });
    const active = subscriptions.data.find((subscription) => {
      if (!['active', 'trialing'].includes(subscription.status)) return false;
      const priceId = subscription.items?.data?.[0]?.price?.id || null;
      return Boolean(tierForStripePrice(priceId));
    });
    if (active) {
      const priceId = active.items?.data?.[0]?.price?.id || null;
      return prisma.user.update({
        where: { id: user.id },
        data: {
          tier: tierForStripePrice(priceId) || user.tier,
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
  const email = normalizeEmail(sanitizeInput(req.body.email));
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

    const existingUser = await findUserByEmail(credentials.email);
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

    const user = await findUserByEmail(credentials.email);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    const passwordMatches = await bcrypt.compare(credentials.password, user.password);
    if (!passwordMatches) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    await prisma.user.update({ where: { id: user.id }, data: { tier: user.tier } });
    const freshUser = await prisma.user.findUnique({ where: { id: user.id } });
    const verifiedUser = await validateStripeEntitlement(freshUser);
    const token = await createSession(res, verifiedUser);
    res.json(publicUserPayload(verifiedUser, token));
  } catch (error) {
    handleAuthError(res, error);
  }
});

// POST /api/auth/request-password-reset
router.post('/request-password-reset', passwordResetLimiter, async (req, res) => {
  try {
    if (!databaseReady(res)) return;
    const email = normalizeEmail(sanitizeInput(req.body.email));
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
    }

    const generic = {
      success: true,
      message: 'If an account exists for this email, a password reset link has been sent.',
    };

    const user = await findUserByEmail(email);
    if (!user) return res.json(generic);

    const token = await createPasswordResetSession(user);
    const resetLink = `${APP_URL.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;

    await sendPasswordResetEmail(user.email, resetLink);
    return res.json(generic);
  } catch (error) {
    handleAuthError(res, error);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    if (!databaseReady(res)) return;
    const token = String(req.body.token || '').trim();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!token) return res.status(400).json({ success: false, message: 'Reset token is missing.' });
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const resetSession = await getValidPasswordResetSession(token);
    if (!resetSession?.email) return res.status(400).json({ success: false, message: 'This reset link is invalid or expired.' });

    const user = await findUserByEmail(resetSession.email);
    if (!user) return res.status(400).json({ success: false, message: 'This reset link is invalid or expired.' });

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: passwordHash } });
    await prisma.session.deleteMany({ where: { email: user.email } });

    const freshUser = await prisma.user.findUnique({ where: { id: user.id } });
    const tokenAfterReset = await createSession(res, freshUser);
    return res.json(publicUserPayload(freshUser, tokenAfterReset));
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
    if (token.startsWith(PASSWORD_RESET_TOKEN_PREFIX)) return res.status(401).json({ success: false, message: 'Missing or invalid token.' });
    const session = await prisma.session.findUnique({ where: { token } });
    if (!session || new Date() > session.expiresAt) return res.status(401).json({ success: false, message: 'Session expired.' });
    let user = await findUserByEmail(session.email);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    user = await validateStripeEntitlement(user);
    res.json({
      id:                 user.id,
      email:              user.email,
      name:               user.name,
      role:               user.role,
      tier:               user.tier,
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
    if (token.startsWith(PASSWORD_RESET_TOKEN_PREFIX)) return res.status(401).json({ success: false, message: 'Missing or invalid token.' });

    const session = await prisma.session.findUnique({ where: { token } });
    if (!session || new Date() > session.expiresAt) return res.status(401).json({ success: false, message: 'Session expired.' });
    const user = await findUserByEmail(session.email);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const profile = deriveOnboardingProfile(req.body || {});
    try {
      await prisma.aiLog.create({
        data: {
          userId: user.id,
          action: 'onboarding_completed',
        },
      });
    } catch (logError) {
      console.warn('[AUTH] onboarding log failed:', logError.message);
    }

    res.json({ success: true, user: publicUserPayload(user, token), profile });
  } catch (error) {
    handleAuthError(res, error);
  }
});

module.exports = router;
