const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();
const { getRecentErrors, getRecentAiActions } = require('../utils/logger');

const ADMIN_EMAIL = process.env.FOUNDER_EMAIL || 'clotteythomas41@gmail.com';

// Protect all admin routes
async function requireAdmin(req, res, next) {
  try {
    const token =
      (req.headers.authorization || '').replace('Bearer ', '') ||
      req.cookies?.session || '';
    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });

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

// GET /api/admin/users
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, tier: true, role: true,
        subscriptionStatus: true, subscriptionType: true,
        createdAt: true, updatedAt: true,
        _count: { select: { drafts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const mapped = users.map(u => ({
      userId: u.id,
      email: u.email,
      tier: u.tier,
      role: u.role,
      subscriptionStatus: u.subscriptionStatus,
      subscriptionType: u.subscriptionType,
      draftsUsed: u._count.drafts,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
    res.json(mapped);
  } catch (e) {
    console.error('[ADMIN] /users error', e.message);
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

    res.json({
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
      recentErrors: getRecentErrors(20),
      recentAiActions: getRecentAiActions(20),
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
