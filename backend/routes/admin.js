const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();
const { getRecentErrors, getRecentAiActions } = require('../utils/logger');

const ADMIN_EMAIL = process.env.FOUNDER_EMAIL || 'clotteythomas41@gmail.com';
const MANUAL_ACCESS_TIERS = new Set(['starter', 'pro', 'agency_starter', 'agency_unlimited']);
const MAX_MANUAL_ACCESS_DAYS = 90;
const MANUAL_COMP_PROVIDER = 'manual_comp';
const MANUAL_COMP_TYPE = 'manual_comp';
const PASSWORD_RESET_TOKEN_PREFIX = 'pwdreset_';

// Protect all admin routes
async function requireAdmin(req, res, next) {
  try {
    const token =
      (req.headers.authorization || '').replace('Bearer ', '') ||
      req.cookies?.session || '';
    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });
    if (token.startsWith(PASSWORD_RESET_TOKEN_PREFIX)) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const session = await prisma.session.findUnique({ where: { token } });
    if (!session || new Date() > session.expiresAt)
      return res.status(401).json({ success: false, message: 'Session expired' });

    const user = await prisma.user.findUnique({ where: { email: session.email } });
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    if (user.role !== 'admin' && user.email !== ADMIN_EMAIL)
      return res.status(403).json({ success: false, message: 'Admin only' });

    req.user = user;
    next();
  } catch (e) {
    console.error('[ADMIN] auth error', e.message);
    return res.status(500).json({ success: false, message: 'Auth error' });
  }
}

function parseManualAccessInput(body, defaults = {}) {
  const tier = String(body.tier || defaults.tier || 'pro').trim();
  const days = Number.parseInt(body.days || defaults.days || '30', 10);
  const reason = String(body.reason || defaults.reason || '').trim();

  if (!MANUAL_ACCESS_TIERS.has(tier)) {
    return { error: 'Invalid temporary access tier.' };
  }
  if (!Number.isInteger(days) || days < 1 || days > MAX_MANUAL_ACCESS_DAYS) {
    return { error: `Days must be between 1 and ${MAX_MANUAL_ACCESS_DAYS}.` };
  }

  return { tier, days, reason };
}

async function grantManualAccess({ user, tier, days, reason, actorEmail, source }) {
  const currentPeriodEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      tier,
      subscriptionStatus: 'active',
      subscriptionType: MANUAL_COMP_TYPE,
      subscriptionId: null,
      provider: MANUAL_COMP_PROVIDER,
      currentPeriodEnd,
    },
    select: {
      id: true,
      email: true,
      tier: true,
      subscriptionStatus: true,
      subscriptionType: true,
      provider: true,
      currentPeriodEnd: true,
      createdAt: true,
    },
  });

  await prisma.errorLog.create({
    data: {
      endpoint: 'admin-billing',
      userId: user.id,
      severity: 'info',
      message: `Manual temporary access granted: tier=${tier}, days=${days}, by=${actorEmail}, source=${source}${reason ? `, reason=${reason.slice(0, 160)}` : ''}`,
    },
  });

  return updatedUser;
}

async function logAdminBillingEvent({ userId, message, severity = 'info' }) {
  await prisma.errorLog.create({
    data: {
      endpoint: 'admin-billing',
      userId,
      severity,
      message,
    },
  });
}

// GET /api/admin/users
router.get('/users', requireAdmin, async (req, res) => {
  try {
    let users = [];
    try {
      users = await prisma.user.findMany({
        select: {
          id: true, email: true, tier: true, role: true,
          name: true,
          subscriptionStatus: true, subscriptionType: true,
          createdAt: true, updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (userErr) {
      console.error('[ADMIN] /users primary query failed, using fallback:', userErr.message);
      // Fallback for environments where DB schema temporarily lags code schema.
      users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          tier: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    const draftCountMap = {};
    try {
      const draftCounts = await prisma.draft.groupBy({
        by: ['userId'],
        _count: { id: true },
      });
      draftCounts.forEach((dc) => {
        draftCountMap[dc.userId] = dc._count.id;
      });
    } catch (draftErr) {
      console.error('[ADMIN] /users draft count fallback:', draftErr.message);
    }

    const lastLoginByEmail = {};
    try {
      const sessionRows = await prisma.session.groupBy({
        by: ['email'],
        _max: { createdAt: true },
      });
      sessionRows.forEach((row) => {
        if (row?.email) {
          lastLoginByEmail[row.email.toLowerCase()] = row._max?.createdAt || null;
        }
      });
    } catch (sessionErr) {
      console.error('[ADMIN] /users session activity fallback:', sessionErr.message);
    }

    const mapped = users.map(u => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      tier: u.tier,
      role: u.role || 'user',
      subscriptionStatus: u.subscriptionStatus,
      subscriptionType: u.subscriptionType,
      draftsUsed: draftCountMap[u.id] || 0,
      createdAt: u.createdAt,
      // Derived from latest session for monitoring activity state.
      lastLogin: lastLoginByEmail[String(u.email || '').toLowerCase()] || null,
      updatedAt: u.updatedAt,
    }));
    res.json(mapped);
  } catch (e) {
    console.error('[ADMIN] /users error', e.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/billing
router.get('/billing', requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        tier: true,
        stripeCustomerId: true,
        subscriptionId: true,
        subscriptionStatus: true,
        subscriptionType: true,
        currentPeriodEnd: true,
        provider: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    const events = await prisma.errorLog.findMany({
      where: {
        endpoint: { in: ['stripe-webhook', 'auth-login', 'admin-billing'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });

    const rows = users.map((user) => {
      const lastEvent = events.find((event) => event.userId === user.id);
      return {
        userId: user.id,
        email: user.email,
        currentTier: user.tier,
        stripeCustomerId: user.stripeCustomerId,
        subscriptionId: user.subscriptionId,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionType: user.subscriptionType,
        nextBillingDate: user.currentPeriodEnd,
        provider: user.provider,
        createdAt: user.createdAt,
        lastWebhookEvent: lastEvent?.message || null,
        lastWebhookAt: lastEvent?.createdAt || null,
      };
    });

    res.json({ users: rows });
  } catch (error) {
    console.error('[ADMIN] /billing error', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/admin/billing/grant-temporary-access
router.post('/billing/grant-temporary-access', requireAdmin, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const input = parseManualAccessInput(req.body, { tier: 'pro', days: '30' });

  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Valid user email is required.' });
  }
  if (input.error) return res.status(400).json({ success: false, message: input.error });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const updatedUser = await grantManualAccess({
      user,
      tier: input.tier,
      days: input.days,
      reason: input.reason,
      actorEmail: req.user.email,
      source: 'email',
    });

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('[ADMIN] grant-temporary-access error', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/admin/billing/close-temporary-access
router.post('/billing/close-temporary-access', requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const users = await prisma.user.findMany({
      where: {
        provider: MANUAL_COMP_PROVIDER,
        subscriptionType: MANUAL_COMP_TYPE,
        subscriptionStatus: 'active',
        currentPeriodEnd: { gt: now },
      },
      select: {
        id: true,
        email: true,
        tier: true,
        currentPeriodEnd: true,
      },
    });

    if (!users.length) return res.json({ success: true, closed: [], message: 'No active temporary access grants found.' });

    await prisma.user.updateMany({
      where: { id: { in: users.map((user) => user.id) } },
      data: {
        tier: 'free',
        subscriptionStatus: 'inactive',
        subscriptionType: 'none',
        subscriptionId: null,
        provider: 'stripe',
        currentPeriodEnd: null,
      },
    });

    await Promise.all(users.map((user) => logAdminBillingEvent({
      userId: user.id,
      severity: 'warning',
      message: `Manual temporary access closed: previousTier=${user.tier}, by=${req.user.email}`,
    })));

    res.json({
      success: true,
      closed: users.map((user) => ({
        email: user.email,
        previousTier: user.tier,
        previousAccessEnd: user.currentPeriodEnd,
      })),
    });
  } catch (error) {
    console.error('[ADMIN] close-temporary-access error', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/metrics
router.get('/metrics', requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const since24h = new Date(now - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newSignups7d,
      activeSubs,
      lifetimeCount,
      totalDrafts,
      drafts24h,
      activeSessions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gt: since7d } } }),
      prisma.user.count({ where: { subscriptionStatus: 'active', tier: { not: 'free' } } }),
      prisma.user.count({ where: { tier: 'lifetime' } }),
      prisma.draft.count(),
      prisma.draft.count({ where: { createdAt: { gt: since24h } } }),
      prisma.session.count({ where: { expiresAt: { gt: now } } }),
    ]);

    // Tier breakdown
    const tierRows = await prisma.user.groupBy({ by: ['tier'], _count: { tier: true } });
    const tierBreakdown = {};
    tierRows.forEach(r => { tierBreakdown[r.tier] = r._count.tier; });

    // Recent signups
    const recentSignups = await prisma.user.findMany({
      where: { createdAt: { gt: since7d } },
      select: { email: true, tier: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const recentErrors = getRecentErrors(20);
    const recentAiActions = getRecentAiActions(20);

    // Aggregate AI usage by action type
    const aiUsageMap = {};
    recentAiActions.forEach(a => { aiUsageMap[a.action] = (aiUsageMap[a.action] || 0) + 1; });
    const aiUsage = Object.entries(aiUsageMap).map(([action, count]) => ({ action, count }));

    // Subscriptions by tier for bar chart
    const subscriptionsByTier = tierRows.map(r => ({ tier: r.tier, _count: { tier: r._count.tier } }));

    res.json({
      // flat fields (legacy)
      totalUsers,
      newSignups7d,
      activeSubs,
      lifetimeCount,
      lifetimeSpotsRemaining: Math.max(0, 200 - lifetimeCount),
      totalDrafts,
      drafts24h,
      activeSessions,
      tierBreakdown,
      recentSignups,
      errors: recentErrors,
      recentAiActions,
      // shaped for MonitoringDashboard frontend
      visitors: { last24h: activeSessions },
      system: {
        newSignups7d,
        activeSubscriptions: activeSubs,
        aiDraftsToday: drafts24h,
        lifetimeTierCount: lifetimeCount,
        lifetimeTierRemaining: Math.max(0, 200 - lifetimeCount),
        lifetimeTierCap: 200,
      },
      timeseries: [], // no time-series table yet — chart shows empty gracefully
      subscriptionsByTier,
      aiUsage,
    });
  } catch (e) {
    console.error('[ADMIN] /metrics error', e.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/invite-queue  (uses Invite table)
router.get('/invite-queue', requireAdmin, async (req, res) => {
  try {
    const invites = await prisma.invite.findMany({
      where: { status: 'pending' },
      orderBy: { sentAt: 'desc' },
    });
    res.json(invites);
  } catch (e) {
    console.error('[ADMIN] /invite-queue error', e.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/admin/approve-invite/:id
router.post('/approve-invite/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.invite.update({
      where: { id: req.params.id },
      data: { status: 'accepted', acceptedAt: new Date() },
    });
    res.json({ success: true });
  } catch (e) {
    console.error('[ADMIN] approve-invite error', e.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/admin/deny-invite/:id
router.post('/deny-invite/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.invite.update({
      where: { id: req.params.id },
      data: { status: 'cancelled' },
    });
    res.json({ success: true });
  } catch (e) {
    console.error('[ADMIN] deny-invite error', e.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/admin/override-tier/:userId
router.post('/override-tier/:userId', requireAdmin, async (req, res) => {
  const { tier } = req.body;
  const validTiers = ['free', 'starter', 'pro', 'agency_starter', 'agency_unlimited', 'lifetime'];
  if (!validTiers.includes(tier))
    return res.status(400).json({ success: false, message: 'Invalid tier' });
  try {
    await prisma.user.update({
      where: { id: req.params.userId },
      data: { tier },
    });
    res.json({ success: true });
  } catch (e) {
    console.error('[ADMIN] override-tier error', e.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/export-usage  (CSV download)
router.get('/export-usage', requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, tier: true, subscriptionStatus: true,
        subscriptionType: true, provider: true, createdAt: true,
        _count: { select: { drafts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const rows = users.map(u => ({
      id: u.id,
      email: u.email,
      tier: u.tier,
      subscriptionStatus: u.subscriptionStatus,
      subscriptionType: u.subscriptionType,
      provider: u.provider || '',
      draftsUsed: u._count.drafts,
      createdAt: u.createdAt.toISOString(),
    }));

    const headers = Object.keys(rows[0] || {}).join(',');
    const lines = rows.map(r =>
      Object.values(r).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csv = [headers, ...lines].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="tgm-usage.csv"');
    res.send(csv);
  } catch (e) {
    console.error('[ADMIN] export-usage error', e.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
