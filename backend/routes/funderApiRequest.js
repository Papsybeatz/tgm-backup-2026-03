/**
 * POST /api/funder-api/request-key
 *
 * Accepts { name, org, email, role, message, source } from the
 * Funder Intelligence API landing page "Request API Key" form.
 *
 * Behaviour:
 *   - Validates required fields (name, org, email)
 *   - Logs the request for internal review
 *   - Attempts to add the contact to Brevo with LEAD_SOURCE=funder-api-request
 *     (falls back gracefully if BREVO_API_KEY is not set)
 */

const express = require('express');
const router = express.Router();

const BREVO_API_URL = 'https://api.brevo.com/v3/contacts';
const BREVO_SMTP_API_URL = 'https://api.brevo.com/v3/smtp/email';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendOnboardingPacket({ apiKey, name, org, email }) {
  const fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@thegrantsmaster.com';
  const fromName = process.env.BREVO_FROM_NAME || 'The Grants Master';
  const docsUrl = 'https://github.com/Papsybeatz/tgm-backup-2026-03/blob/main/docs/funder-intelligence-api.md';
  const postmanUrl = 'https://github.com/Papsybeatz/tgm-backup-2026-03/blob/main/docs/funder-intelligence-api.postman.json';

  const htmlContent = `
    <div style="font-family:Inter,Arial,sans-serif;color:#0A0F1A;line-height:1.6;">
      <h2 style="margin:0 0 12px 0;">You're in — Funder Intelligence API pilot access</h2>
      <p>Hi ${name},</p>
      <p>Thanks for requesting access for <strong>${org}</strong>.</p>
      <p>Here is your onboarding packet:</p>
      <ol>
        <li>API docs: <a href="${docsUrl}">${docsUrl}</a></li>
        <li>Postman collection: <a href="${postmanUrl}">${postmanUrl}</a></li>
        <li>Workflow: register funder → funder-fit → scoring → batch → cycle intelligence → webhook routing</li>
      </ol>
      <p>Reply to this email with your preferred onboarding time and we will issue your production API key after your setup call.</p>
      <p>— TGM Team</p>
    </div>
  `;

  const response = await fetch(BREVO_SMTP_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({
      sender: { email: fromEmail, name: fromName },
      to: [{ email: email.trim().toLowerCase(), name: name.trim() }],
      subject: 'TGM Funder Intelligence API — Onboarding Packet',
      htmlContent,
    }),
  });

  if (response.status >= 200 && response.status < 300) {
    return { sent: true };
  }

  const errorBody = await response.text();
  return { sent: false, error: `Brevo SMTP error ${response.status}: ${errorBody.slice(0, 300)}` };
}

router.post('/request-key', async (req, res) => {
  const {
    name = '',
    org = '',
    email = '',
    role = '',
    message = '',
    source = 'funder-api-request',
  } = req.body || {};

  if (!name.trim()) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  if (!org.trim()) {
    return res.status(400).json({ error: 'Organization is required.' });
  }
  if (!email.trim() || !isValidEmail(email.trim())) {
    return res.status(400).json({ error: 'A valid work email is required.' });
  }

  console.log('[FUNDER-API REQUEST]', {
    name: name.trim(),
    org: org.trim(),
    email: email.trim().toLowerCase(),
    role: role.trim() || '(not specified)',
    message: message.trim() || '(none)',
    source,
    at: new Date().toISOString(),
  });

  const apiKey = process.env.BREVO_API_KEY;
  const listId = process.env.BREVO_FUNDER_LIST_ID
    ? Number(process.env.BREVO_FUNDER_LIST_ID)
    : process.env.BREVO_LIST_ID
      ? Number(process.env.BREVO_LIST_ID)
      : null;

  if (!apiKey) {
    // Dev / no-Brevo fallback — still succeed so the form confirms
    console.warn('[FUNDER-API REQUEST] BREVO_API_KEY not set — skipping Brevo call');
    return res.status(200).json({ success: true, dev: true });
  }

  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const payload = {
    email: email.trim().toLowerCase(),
    attributes: {
      FIRSTNAME: firstName,
      LASTNAME: lastName,
      COMPANY: org.trim(),
      LEAD_SOURCE: source,
      ROLE: role.trim() || '',
      MESSAGE: message.trim().slice(0, 1000),
    },
    updateEnabled: true,
  };
  if (listId) payload.listIds = [listId];

  try {
    const brevoRes = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify(payload),
    });

    if (brevoRes.status === 201 || brevoRes.status === 204) {
      const packet = await sendOnboardingPacket({ apiKey, name, org, email });
      if (!packet.sent) {
        console.error('[FUNDER-API REQUEST] Onboarding packet error:', packet.error);
      }
      return res.status(packet.sent ? 200 : 202).json({
        success: true,
        onboardingPacketSent: packet.sent,
        warning: packet.sent ? null : 'Contact saved, but onboarding packet email failed.',
      });
    }

    const errorBody = await brevoRes.json().catch(() => ({}));
    if (brevoRes.status === 400 && errorBody?.code === 'duplicate_parameter') {
      const packet = await sendOnboardingPacket({ apiKey, name, org, email });
      if (!packet.sent) {
        console.error('[FUNDER-API REQUEST] Onboarding packet error:', packet.error);
      }
      return res.status(packet.sent ? 200 : 202).json({
        success: true,
        onboardingPacketSent: packet.sent,
        warning: packet.sent ? null : 'Contact exists, but onboarding packet email failed.',
      });
    }

    console.error('[FUNDER-API REQUEST] Brevo error:', brevoRes.status, errorBody);
    return res.status(502).json({ error: 'Failed to submit. Please email us directly.' });
  } catch (err) {
    console.error('[FUNDER-API REQUEST] Network error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

module.exports = router;
