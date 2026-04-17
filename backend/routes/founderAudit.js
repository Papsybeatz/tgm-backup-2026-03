// backend/routes/founderAudit.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();

const FOUNDER_EMAIL = process.env.FOUNDER_EMAIL || 'founder@grantsmaster.app';

// Dummy helpers for logs/events (replace with real DB queries if available)
async function getErrorsLast24h() {
  // Replace with real log DB query
  return [];
}
async function getWebhookEventsLast24h() {
  // Replace with real webhook event DB query
  return [];
}

// Metrics helpers
async function getTotalUsers() {
  return prisma.user.count();
}
async function getActiveSessions() {
  return prisma.session.count({
    where: { expiresAt: { gt: new Date() } },
  });
}
async function getTotalDrafts() {
  return prisma.draft.count();
}
async function getDraftsLast24h() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return prisma.draft.count({ where: { createdAt: { gt: since } } });
}

// Access control middleware
function founderOrAdmin(req, res, next) {
  const user = req.user;
  if (!user || (user.role !== 'admin' && user.email !== FOUNDER_EMAIL)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
}

// GET /api/founder/audit
router.get('/audit', founderOrAdmin, async (req, res) => {
  const [totalUsers, activeSessions, totalDrafts, draftsLast24h, errorsLast24h, webhookEventsLast24h] = await Promise.all([
    getTotalUsers(),
    getActiveSessions(),
    getTotalDrafts(),
    getDraftsLast24h(),
    getErrorsLast24h(),
    getWebhookEventsLast24h(),
  ]);

  // Feature readiness (hardcoded for demo, replace with real checks)
  const featureReadiness = {
    auth: true,
    sessions: true,
    autosave: true,
    teamInvites: true,
    webhookVerification: true,
    tierUnlocks: true,
    dashboards: true,
    usageMeter: true,
  };

  // Security status (hardcoded for demo, replace with real checks)
  const securityStatus = {
    inputSanitization: 'enabled',
    routeProtection: 'enabled',
    rateLimiting: 'enabled',
    webhookSignatureVerification: 'enabled',
  };

  // Launch checklist (hardcoded for demo, replace with real checks)
  const launchChecklist = {
    frontendComplete: true,
    backendComplete: true,
    securityComplete: true,
    billingComplete: true,
    onboardingComplete: true,
  };

  res.json({
    system: {
      totalUsers,
      activeSessions,
      totalDrafts,
      draftsLast24h,
      errorsLast24h,
      webhookEventsLast24h,
    },
    featureReadiness,
    securityStatus,
    launchChecklist,
    errors: errorsLast24h,
    webhookEvents: webhookEventsLast24h,
  });
});

module.exports = router;
