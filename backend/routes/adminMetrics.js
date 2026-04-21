// backend/routes/adminMetrics.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();
const { getPlausibleStats } = require('../utils/plausible');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.FOUNDER_EMAIL || 'Clotteythomas41@gmail.com';
const LIFETIME_CAP = 200;

let metricsCache = null;
let cacheTime = 0;
const CACHE_TTL = 60_000;

function adminOnly(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const token = authHeader.slice(7);
  prisma.session.findUnique({ where: { token } })
    .then(session => {
      if (!session) return res.status(401).json({ success: false, message: 'Unauthorized' });
      req.userEmail = session.email;
      if (session.email !== ADMIN_EMAIL) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      next();
    });
}

async function loadMetrics() {
  const now = new Date();
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  const startOf7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const [subscriptions, aiUsage, recentSignups, errors, lifetimeClaimed, newSignups7d, todayDrafts, activeSubscriptions] = 
    await prisma.$transaction([
      prisma.user.groupBy({ by: ['tier'], _count: { tier: true } }),
      prisma.aiLog.groupBy({ by: ['action'], _count: { action: true } }),
      prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, email: true, name: true, tier: true, createdAt: true } }),
      prisma.errorLog.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.lifetimeTier.count({ where: { claimed: true } }),
      prisma.user.count({ where: { createdAt: { gte: startOf7d } } }),
      prisma.aiLog.count({ where: { action: 'generate', createdAt: { gte: startOfDay } } }),
      prisma.user.count({ where: { tier: { not: 'free' } } }),
    ]);

  return { subscriptions, aiUsage, recentSignups, errors, lifetimeClaimed, newSignups7d, todayDrafts, activeSubscriptions };
}

router.get('/metrics', adminOnly, async (req, res) => {
  try {
    const now = Date.now();

    if (metricsCache && now - cacheTime < CACHE_TTL) {
      return res.json(metricsCache);
    }

    const [dbMetrics, visitors] = await Promise.all([loadMetrics(), getPlausibleStats()]);

    metricsCache = {
      visitors,
      system: {
        newSignups7d: dbMetrics.newSignups7d,
        activeSubscriptions: dbMetrics.activeSubscriptions,
        aiDraftsToday: dbMetrics.todayDrafts,
        lifetimeTierCount: dbMetrics.lifetimeClaimed,
        lifetimeTierCap: LIFETIME_CAP,
        lifetimeTierRemaining: LIFETIME_CAP - dbMetrics.lifetimeClaimed,
      },
      subscriptionsByTier: dbMetrics.subscriptions,
      aiUsage: dbMetrics.aiUsage,
      recentSignups: dbMetrics.recentSignups.map(u => ({
        id: u.id, email: u.email, name: u.name || 'N/A', tier: u.tier, createdAt: u.createdAt.toISOString()
      })),
      errors: dbMetrics.errors.map(e => ({
        id: e.id, message: e.message, endpoint: e.endpoint, severity: e.severity, userId: e.userId, createdAt: e.createdAt.toISOString()
      })),
    };

    cacheTime = now;
    res.json(metricsCache);
  } catch (err) {
    console.error('Admin metrics error:', err);
    res.status(500).json({ success: false, message: 'Error fetching metrics' });
  }
});

router.delete('/cache', adminOnly, (req, res) => {
  metricsCache = null;
  cacheTime = 0;
  require('../utils/plausible').clearPlausibleCache();
  res.json({ success: true, message: 'Cache cleared' });
});

module.exports = router;