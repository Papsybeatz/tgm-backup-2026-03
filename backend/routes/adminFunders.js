/**
 * backend/routes/adminFunders.js
 *
 * Admin-only routes for managing funder leads and manually issuing
 * sandbox keys. All routes require session auth + admin email check.
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const requireAuth = require('../middleware/auth');
const { sendBrevoEmail } = require('../utils/brevo');

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.FOUNDER_EMAIL || 'clotteythomas41@gmail.com';

function requireAdmin(req, res, next) {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Not authenticated.' });
  if (user.role !== 'admin' && user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  return next();
}

// Helper: call sidecar with internal secret
async function sidecarPost(path, body) {
  const base = process.env.FUNDER_INTELLIGENCE_BASE_URL;
  const secret = process.env.FUNDER_INTELLIGENCE_INTERNAL_SECRET;
  if (!base || !secret) return { ok: false, error: 'Sidecar not configured.' };

  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// GET /api/admin/funders/leads — list all leads with status and cycle history
router.get('/leads', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    const where = status ? { status } : {};
    const leads = await prisma.funderLead.findMany({
      where,
      include: { cycles: { orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });
    const total = await prisma.funderLead.count({ where });
    return res.json({ leads, total });
  } catch (err) {
    console.error('[ADMIN FUNDERS] list error:', err.message);
    return res.status(500).json({ error: 'Failed to load leads.' });
  }
});

// GET /api/admin/funders/leads/:leadId — single lead detail
router.get('/leads/:leadId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const lead = await prisma.funderLead.findUnique({
      where: { id: req.params.leadId },
      include: { cycles: true },
    });
    if (!lead) return res.status(404).json({ error: 'Lead not found.' });
    return res.json({ lead });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load lead.' });
  }
});

// POST /api/admin/funders/leads/:leadId/approve — approve lead (no key yet)
router.post('/leads/:leadId/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    const lead = await prisma.funderLead.update({
      where: { id: req.params.leadId },
      data: { status: 'approved' },
    });

    // Notify the funder they're approved and can now check out
    const appUrl = process.env.APP_URL || 'https://www.thegrantsmaster.com';
    sendBrevoEmail({
      to: lead.email,
      toName: lead.name,
      subject: 'TGM Funder Intelligence API — Your application is approved',
      htmlContent: `
        <div style="font-family:Inter,Arial,sans-serif;color:#0A0F1A;line-height:1.6;">
          <h2>You're approved — Funder Intelligence API</h2>
          <p>Hi ${lead.name},</p>
          <p>Your application for <strong>${lead.orgName}</strong> has been approved.</p>
          <p>Visit the checkout page to activate your first grant cycle:</p>
          <p><a href="${appUrl}/funder-api" style="background:#0A0F1A;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px;">Activate your cycle →</a></p>
          <p>— TGM Team</p>
        </div>
      `,
    }).catch(() => {});

    return res.json({ success: true, lead });
  } catch (err) {
    console.error('[ADMIN FUNDERS] approve error:', err.message);
    return res.status(500).json({ error: 'Failed to approve lead.' });
  }
});

// POST /api/admin/funders/leads/:leadId/reject — reject lead
router.post('/leads/:leadId/reject', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { reason = '' } = req.body;
    const lead = await prisma.funderLead.update({
      where: { id: req.params.leadId },
      data: { status: 'rejected' },
    });

    sendBrevoEmail({
      to: lead.email,
      toName: lead.name,
      subject: 'TGM Funder Intelligence API — Application update',
      htmlContent: `
        <div style="font-family:Inter,Arial,sans-serif;color:#0A0F1A;line-height:1.6;">
          <h2>Funder Intelligence API — Application update</h2>
          <p>Hi ${lead.name},</p>
          <p>Thank you for your interest in the TGM Funder Intelligence API.</p>
          <p>After review, we are unable to approve your application at this time${reason ? ': ' + reason : ''}.</p>
          <p>If you believe this is an error, please reply to this email.</p>
          <p>— TGM Team</p>
        </div>
      `,
    }).catch(() => {});

    return res.json({ success: true, lead });
  } catch (err) {
    console.error('[ADMIN FUNDERS] reject error:', err.message);
    return res.status(500).json({ error: 'Failed to reject lead.' });
  }
});

// POST /api/admin/funders/leads/:leadId/issue-sandbox — provision sandbox key manually
router.post('/leads/:leadId/issue-sandbox', requireAuth, requireAdmin, async (req, res) => {
  try {
    const lead = await prisma.funderLead.findUnique({ where: { id: req.params.leadId } });
    if (!lead) return res.status(404).json({ error: 'Lead not found.' });

    // Provision sandbox key on sidecar
    const result = await sidecarPost('/internal/funders/provision', {
      name: lead.name,
      orgName: lead.orgName,
      email: lead.email,
      planTier: 'scale',
      keyScope: 'sandbox',
    });

    if (!result.ok) {
      return res.status(502).json({ error: 'Sidecar provisioning failed.', detail: result.error || result.data });
    }

    const { funder_id: sidecarFunderId, api_key: orgApiKey } = result.data;

    await prisma.funderLead.update({
      where: { id: lead.id },
      data: { status: 'sandbox_issued', sidecarFunderId, orgApiKey },
    });

    // Email sandbox credentials
    const sidecarBase = process.env.FUNDER_INTELLIGENCE_BASE_URL || '';
    const docsUrl = 'https://github.com/Papsybeatz/tgm-backup-2026-03/blob/main/docs/funder-intelligence-api.md';
    sendBrevoEmail({
      to: lead.email,
      toName: lead.name,
      subject: 'TGM Funder Intelligence API — Sandbox Access',
      htmlContent: `
        <div style="font-family:Inter,Arial,sans-serif;color:#0A0F1A;line-height:1.6;">
          <h2>Your sandbox is ready — Funder Intelligence API</h2>
          <p>Hi ${lead.name},</p>
          <p>Here are your sandbox credentials for <strong>${lead.orgName}</strong>:</p>
          <table style="border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:4px 8px;font-weight:bold;">Sandbox API Key</td><td style="padding:4px 8px;font-family:monospace;">${orgApiKey}</td></tr>
            <tr><td style="padding:4px 8px;font-weight:bold;">Funder ID</td><td style="padding:4px 8px;font-family:monospace;">${sidecarFunderId}</td></tr>
            <tr><td style="padding:4px 8px;font-weight:bold;">Endpoint</td><td style="padding:4px 8px;font-family:monospace;">${sidecarBase}</td></tr>
          </table>
          <p>Sandbox keys do not require a cycle_id. Use them to explore the API before your first paid cycle.</p>
          <p><a href="${docsUrl}">Full API documentation →</a></p>
          <p>— TGM Team</p>
        </div>
      `,
    }).catch(() => {});

    return res.json({ success: true, sidecarFunderId, orgApiKey, keyScope: 'sandbox' });
  } catch (err) {
    console.error('[ADMIN FUNDERS] issue-sandbox error:', err.message);
    return res.status(500).json({ error: 'Failed to issue sandbox key.' });
  }
});

module.exports = router;
