/**
 * POST /api/funder-api/request-key
 *
 * Accepts funder pilot application form data. Validates, risk-scores, and
 * saves a FunderLead to Postgres. Does NOT auto-provision API keys —
 * that happens after Stripe checkout (production) or admin approval (sandbox).
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { sendBrevoEmail } = require('../utils/brevo');

const router = express.Router();
const prisma = new PrismaClient();

const BREVO_API_URL = 'https://api.brevo.com/v3/contacts';

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.ca',
  'hotmail.com', 'hotmail.co.uk', 'outlook.com', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me', 'protonmail.com',
  'tutanota.com', 'guerrillamail.com', 'mailinator.com', 'tempmail.com',
  'trashmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
  'throwam.com', 'dispostable.com', 'yopmail.com',
]);

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isWorkEmail(email) {
  const domain = String(email || '').split('@')[1]?.toLowerCase() || '';
  return !PERSONAL_EMAIL_DOMAINS.has(domain);
}

function getEmailDomain(email) {
  return String(email || '').split('@')[1]?.toLowerCase() || '';
}

/**
 * Score lead risk 0–100. Higher = more suspicious.
 * 40–69: pending_review. 70+: reject.
 */
function scoreLeadRisk(form) {
  const reasons = [];
  let score = 0;

  const email = String(form.email || '').toLowerCase();
  const domain = getEmailDomain(email);

  // Personal/disposable email after work-email check shouldn't reach here,
  // but include it as a double-check
  if (PERSONAL_EMAIL_DOMAINS.has(domain)) {
    score += 40;
    reasons.push('personal_email_domain');
  }

  // Very short org name
  const orgName = String(form.org || '').trim();
  if (orgName.length < 3) {
    score += 30;
    reasons.push('org_name_too_short');
  }

  // No role provided
  if (!String(form.role || '').trim()) {
    score += 10;
    reasons.push('missing_role');
  }

  // No website
  if (!String(form.website || '').trim()) {
    score += 5;
    reasons.push('missing_website');
  }

  // Gibberish name (all lowercase single word, no spaces)
  const name = String(form.name || '').trim();
  if (name.length > 0 && !/\s/.test(name) && name === name.toLowerCase()) {
    score += 15;
    reasons.push('suspicious_name_format');
  }

  return { riskScore: Math.min(100, score), reasons };
}

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

function buildUnderReviewEmail({ name, org }) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#0A0F1A;line-height:1.6;">
      <h2 style="margin:0 0 12px 0;">Application received — Funder Intelligence API</h2>
      <p>Hi ${name},</p>
      <p>Thanks for your interest in the TGM Funder Intelligence API for <strong>${org}</strong>.</p>
      <p>Your application is under review. We typically respond within 1 business day.</p>
      <p>If you have questions in the meantime, reply to this email.</p>
      <p>— TGM Team</p>
    </div>
  `;
}

function buildAdminAlertEmail({ name, org, email, role, planRequested, cycleName, cycleYear, riskScore, riskReasons, leadId }) {
  const adminUrl = `${process.env.APP_URL || 'https://www.thegrantsmaster.com'}/admin/funders/${leadId}`;
  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#0A0F1A;line-height:1.6;">
      <h2 style="margin:0 0 12px 0;">New Funder API Lead — Review Required</h2>
      <table style="border-collapse:collapse;width:100%;">
        <tr><td style="padding:4px 8px;font-weight:bold;">Name</td><td style="padding:4px 8px;">${name}</td></tr>
        <tr><td style="padding:4px 8px;font-weight:bold;">Org</td><td style="padding:4px 8px;">${org}</td></tr>
        <tr><td style="padding:4px 8px;font-weight:bold;">Email</td><td style="padding:4px 8px;">${email}</td></tr>
        <tr><td style="padding:4px 8px;font-weight:bold;">Role</td><td style="padding:4px 8px;">${role || '—'}</td></tr>
        <tr><td style="padding:4px 8px;font-weight:bold;">Plan</td><td style="padding:4px 8px;">${planRequested || '—'}</td></tr>
        <tr><td style="padding:4px 8px;font-weight:bold;">Cycle</td><td style="padding:4px 8px;">${cycleName || '—'} ${cycleYear || ''}</td></tr>
        <tr><td style="padding:4px 8px;font-weight:bold;">Risk Score</td><td style="padding:4px 8px;color:${riskScore >= 40 ? '#cc0000' : '#007700'};">${riskScore} — ${riskReasons.join(', ') || 'clean'}</td></tr>
      </table>
      <p style="margin-top:16px;"><a href="${adminUrl}" style="background:#0A0F1A;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px;">Review Application</a></p>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

router.post('/request-key', async (req, res) => {
  const {
    name = '',
    org = '',
    email = '',
    role = '',
    website = '',
    country = '',
    planRequested = '',
    cycleName = '',
    cycleYear = '',
    expectedVolume = '',
    message = '',
    source = 'funder-api-request',
    // Honeypot: bots fill this invisible field, humans don't
    _hp = '',
  } = req.body || {};

  // Honeypot check — bots fill hidden fields
  if (_hp.trim()) {
    // Silently accept to avoid tipping off bots
    return res.status(200).json({ success: true });
  }

  const trimmedName = name.trim();
  const trimmedOrg = org.trim();
  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedName) return res.status(400).json({ error: 'Name is required.' });
  if (!trimmedOrg) return res.status(400).json({ error: 'Organization is required.' });
  if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }
  if (!isWorkEmail(trimmedEmail)) {
    return res.status(400).json({ error: 'Please use your organization email address (not a personal email).' });
  }

  const { riskScore, reasons: riskReasons } = scoreLeadRisk({ name: trimmedName, org: trimmedOrg, email: trimmedEmail, role, website });

  // Hard-reject high-risk submissions
  if (riskScore >= 70) {
    console.warn('[FUNDER-API REQUEST] High-risk submission rejected', { email: trimmedEmail, riskScore, riskReasons });
    return res.status(400).json({ error: 'Unable to process your application. Please contact us directly.' });
  }

  // Determine initial status
  const initialStatus = riskScore >= 40 ? 'pending_review' : 'pending_review';

  // Check for existing lead by email
  let lead;
  try {
    const existing = await prisma.funderLead.findFirst({ where: { email: trimmedEmail } });
    if (existing) {
      if (existing.status === 'pending_review') {
        return res.status(200).json({ success: true, status: 'already_pending', message: 'Your application is already under review. We will be in touch shortly.' });
      }
      if (existing.status === 'rejected') {
        return res.status(400).json({ error: 'We were unable to approve your application. Please contact us directly.' });
      }
      // Approved or active funder requesting a new cycle — respond with checkout hint
      return res.status(200).json({ success: true, status: 'approved', leadId: existing.id, message: 'Your organization is approved. Complete checkout to activate your new cycle.' });
    }

    lead = await prisma.funderLead.create({
      data: {
        name: trimmedName,
        orgName: trimmedOrg,
        email: trimmedEmail,
        role: role.trim() || null,
        website: website.trim() || null,
        country: country.trim() || null,
        planRequested: planRequested.trim() || null,
        cycleName: cycleName.trim() || null,
        cycleYear: cycleYear ? Number(cycleYear) : null,
        expectedVolume: expectedVolume ? Number(expectedVolume) : null,
        message: message.trim().slice(0, 2000) || null,
        source,
        riskScore,
        riskReasons,
        status: initialStatus,
      },
    });
  } catch (dbErr) {
    console.error('[FUNDER-API REQUEST] Prisma error:', dbErr);
    // Graceful degradation: continue without Prisma if DB is unavailable
    lead = { id: 'no-db', name: trimmedName, orgName: trimmedOrg };
  }

  console.log('[FUNDER-API REQUEST] Lead created', { id: lead?.id, email: trimmedEmail, riskScore, status: initialStatus });

  // Save to Brevo (best-effort)
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (brevoApiKey) {
    const listId = process.env.BREVO_FUNDER_LIST_ID
      ? Number(process.env.BREVO_FUNDER_LIST_ID)
      : process.env.BREVO_LIST_ID
        ? Number(process.env.BREVO_LIST_ID)
        : null;

    const nameParts = trimmedName.split(/\s+/);
    const brevoPayload = {
      email: trimmedEmail,
      attributes: {
        FIRSTNAME: nameParts[0] || '',
        LASTNAME: nameParts.slice(1).join(' ') || '',
        COMPANY: trimmedOrg,
        LEAD_SOURCE: source,
        ROLE: role.trim() || '',
        MESSAGE: message.trim().slice(0, 1000),
      },
      updateEnabled: true,
    };
    if (listId) brevoPayload.listIds = [listId];

    fetch(BREVO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': brevoApiKey },
      body: JSON.stringify(brevoPayload),
    }).catch((err) => console.error('[FUNDER-API REQUEST] Brevo contact error:', err.message));

    // Email applicant
    sendBrevoEmail({
      to: trimmedEmail,
      toName: trimmedName,
      subject: 'TGM Funder Intelligence API — Application Received',
      htmlContent: buildUnderReviewEmail({ name: trimmedName, org: trimmedOrg }),
    }).then((result) => {
      if (!result.sent) console.error('[FUNDER-API REQUEST] Applicant email failed:', result.error);
    });

    // Email admin
    const adminEmail = process.env.ADMIN_EMAIL || process.env.FOUNDER_EMAIL || process.env.CONTACT_TO_EMAIL || process.env.BREVO_FROM_EMAIL;
    if (adminEmail) {
      sendBrevoEmail({
        to: adminEmail,
        toName: 'TGM Admin',
        subject: `[TGM] New Funder API Lead: ${trimmedOrg} (risk ${riskScore})`,
        htmlContent: buildAdminAlertEmail({
          name: trimmedName, org: trimmedOrg, email: trimmedEmail, role,
          planRequested, cycleName, cycleYear,
          riskScore, riskReasons, leadId: lead?.id || 'unknown',
        }),
      }).then((result) => {
        if (!result.sent) console.error('[FUNDER-API REQUEST] Admin alert failed:', result.error);
      });
    }
  }

  return res.status(200).json({ success: true, status: 'pending_review' });
});

module.exports = router;
