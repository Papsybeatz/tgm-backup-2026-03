/**
 * POST /api/funder-api/request-key
 *
 * Automates pilot funder intake:
 *   1. Validate the landing-page form payload
 *   2. Provision a real sidecar funder + API key when the sidecar base URL is configured
 *   3. Save the lead in Brevo
 *   4. Email the funder their onboarding packet
 *   5. Alert the internal admin inbox
 */

const express = require('express');

const router = express.Router();

const BREVO_CONTACTS_URL = 'https://api.brevo.com/v3/contacts';
const BREVO_SMTP_URL = 'https://api.brevo.com/v3/smtp/email';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getFunderApiBaseUrl() {
  const configured = String(process.env.FUNDER_INTELLIGENCE_BASE_URL || '').trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  if (process.env.NODE_ENV !== 'production') {
    return 'http://127.0.0.1:4500';
  }
  return '';
}

function buildDefaultRubric() {
  return {
    criteria: [
      {
        name: 'Mission Alignment',
        weight: 40,
        description: 'How well the application aligns with funder priorities, outcomes, and mission.',
      },
      {
        name: 'Execution Readiness',
        weight: 35,
        description: 'Operational readiness, delivery plan, feasibility, and supporting evidence.',
      },
      {
        name: 'Budget Credibility',
        weight: 25,
        description: 'Budget realism, direct program allocation, and cost-to-impact clarity.',
      },
    ],
  };
}

async function postJson(url, payload, options) {
  const headers = Object.assign(
    { 'Content-Type': 'application/json' },
    options && options.headers ? options.headers : {}
  );

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let body = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch (_error) {
      body = { raw: text };
    }
  }

  return { response, body, text };
}

async function provisionFunderAccount(form) {
  const baseUrl = getFunderApiBaseUrl();
  if (!baseUrl) {
    return {
      autoProvisioned: false,
      reason: 'FUNDER_INTELLIGENCE_BASE_URL is not configured.',
      baseUrl: '',
      funder_id: null,
      api_key: null,
      plan_tier: null,
    };
  }

  const result = await postJson(
    `${baseUrl}/funder/register`,
    {
      name: form.org,
      mission: form.message || `Pilot funder onboarding profile for ${form.org}.`,
      priority_areas: [],
      geographies: [],
      eligibility_rules: [],
      rubric_definition: buildDefaultRubric(),
      plan_tier: 'scale',
      api_key_label: `pilot-${form.email.toLowerCase()}`,
    }
  );

  if (result.response.status !== 201) {
    const errorMessage = result.body && result.body.message
      ? result.body.message
      : result.text || `Sidecar returned ${result.response.status}`;
    throw new Error(`Funder provisioning failed: ${errorMessage}`);
  }

  return {
    autoProvisioned: true,
    reason: null,
    baseUrl,
    funder_id: result.body.funder_id,
    api_key: result.body.api_key,
    plan_tier: result.body.plan_tier,
    validation_report: result.body.validation_report || null,
  };
}

async function upsertBrevoContact(form, brevoApiKey) {
  const listId = process.env.BREVO_FUNDER_LIST_ID
    ? Number(process.env.BREVO_FUNDER_LIST_ID)
    : process.env.BREVO_LIST_ID
      ? Number(process.env.BREVO_LIST_ID)
      : null;

  const nameParts = form.name.split(/\s+/);
  const payload = {
    email: form.email.toLowerCase(),
    attributes: {
      FIRSTNAME: nameParts[0] || '',
      LASTNAME: nameParts.slice(1).join(' ') || '',
      COMPANY: form.org,
      LEAD_SOURCE: form.source,
      ROLE: form.role || '',
      MESSAGE: form.message.slice(0, 1000),
    },
    updateEnabled: true,
  };

  if (listId) {
    payload.listIds = [listId];
  }

  const result = await postJson(BREVO_CONTACTS_URL, payload, {
    headers: { 'api-key': brevoApiKey },
  });

  if (result.response.status >= 200 && result.response.status < 300) {
    return { saved: true };
  }

  if (result.response.status === 400 && result.body && result.body.code === 'duplicate_parameter') {
    return { saved: true };
  }

  const errorMessage = result.body && (result.body.message || result.body.code)
    ? (result.body.message || result.body.code)
    : result.text || `Brevo returned ${result.response.status}`;
  return { saved: false, error: errorMessage };
}

async function sendBrevoEmail(payload, brevoApiKey) {
  const result = await postJson(BREVO_SMTP_URL, payload, {
    headers: { 'api-key': brevoApiKey },
  });

  if (result.response.status >= 200 && result.response.status < 300) {
    return { sent: true };
  }

  const errorMessage = result.body && result.body.message
    ? result.body.message
    : result.text || `Brevo returned ${result.response.status}`;
  return { sent: false, error: errorMessage };
}

async function sendOnboardingPacket(form, provisioned, brevoApiKey) {
  const fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@thegrantsmaster.com';
  const fromName = process.env.BREVO_FROM_NAME || 'The Grants Master';
  const docsUrl = 'https://www.thegrantsmaster.com/funder-api';
  const baseUrl = provisioned.baseUrl || 'https://your-funder-intelligence-host';
  const hasLiveKey = Boolean(provisioned.autoProvisioned && provisioned.api_key && provisioned.funder_id);

  const safeName = escapeHtml(form.name);
  const safeOrg = escapeHtml(form.org);
  const safeApiKey = escapeHtml(provisioned.api_key || '');
  const safeFunderId = escapeHtml(provisioned.funder_id || '');
  const safeBaseUrl = escapeHtml(baseUrl);

  const quickStart = hasLiveKey
    ? `<div style="background:#0A0F1A;border-radius:8px;padding:16px 20px;">
         <pre style="margin:0;font-size:12px;color:#A3E635;white-space:pre-wrap;word-break:break-all;">curl -X POST ${safeBaseUrl}/application/score \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${safeApiKey}" \\
  -d '{
    "funder_id": "${safeFunderId}",
    "application": {
      "project_summary": "Sample proposal summary",
      "narratives": ["Sample narrative"],
      "budget": { "total": 100000, "admin_cost": 15000, "program_cost": 85000 },
      "org_profile": { "organization_type": "nonprofit", "country": "usa" },
      "metadata": { "geography": "usa", "cycle": "pilot" }
    }
  }'</pre>
       </div>`
    : `<div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;padding:16px 20px;color:#9A3412;font-size:13px;">
         Your application was received and your onboarding packet is ready. Final API key issuance is still pending because automated sidecar provisioning is not configured yet.
       </div>`;

  const apiKeyBlock = hasLiveKey
    ? `<div style="background:#F0F4FF;border-left:4px solid #003A8C;border-radius:8px;padding:20px 24px;margin:24px 0;">
         <div style="font-size:11px;font-weight:700;color:#003A8C;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Your API Key</div>
         <div style="font-family:'Courier New',monospace;font-size:15px;font-weight:700;color:#0A0F1A;word-break:break-all;">${safeApiKey}</div>
         <div style="font-size:12px;color:#64748B;margin-top:8px;">Use this value in the <code>x-api-key</code> header. Your funder ID is <code>${safeFunderId}</code>.</div>
       </div>`
    : '';

  const htmlContent = `
    <div style="font-family:Inter,Arial,sans-serif;color:#0A0F1A;line-height:1.6;max-width:600px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#0A0F1A,#003A8C);border-radius:12px;padding:28px 32px;margin-bottom:24px;">
        <div style="font-size:22px;font-weight:800;color:#D4AF37;letter-spacing:-0.5px;">The Grants Master</div>
        <div style="color:#fff;font-size:14px;margin-top:6px;opacity:.8;">Funder Intelligence API onboarding</div>
      </div>

      <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #E2E8F0;">
        <h2 style="margin:0 0 16px;font-size:20px;color:#0A0F1A;">You're in, ${safeName}.</h2>
        <p style="margin:0 0 16px;color:#334155;">Thanks for requesting access for <strong>${safeOrg}</strong>.</p>
        <p style="margin:0 0 16px;color:#334155;">This packet gives you the fastest path into scoring, fit intelligence, filtering, cohort analytics, and webhook routing.</p>

        ${apiKeyBlock}

        <h3 style="margin:24px 0 12px;font-size:15px;color:#0A0F1A;">Quick start</h3>
        ${quickStart}

        <h3 style="margin:24px 0 12px;font-size:15px;color:#0A0F1A;">What to do next</h3>
        <ol style="margin:0 0 20px 20px;padding:0;color:#334155;">
          <li>Review the onboarding docs and endpoint workflow.</li>
          <li>Test a sample scoring or funder-fit request.</li>
          <li>Reply with two times that work for your 30-minute onboarding session.</li>
        </ol>

        <a href="${docsUrl}" style="display:inline-block;background:#003A8C;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
          Open Funder API Docs
        </a>
      </div>
    </div>
  `;

  return sendBrevoEmail({
    sender: { email: fromEmail, name: fromName },
    to: [{ email: form.email.toLowerCase(), name: form.name }],
    subject: hasLiveKey
      ? 'Your TGM Funder Intelligence API key is ready'
      : 'Your TGM Funder Intelligence API request is received',
    htmlContent,
  }, brevoApiKey);
}

async function sendAdminAlert(form, provisioned, brevoContactSaved, brevoApiKey) {
  const fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@thegrantsmaster.com';
  const adminEmail = process.env.ADMIN_EMAIL || process.env.FOUNDER_EMAIL || process.env.CONTACT_TO_EMAIL || fromEmail;
  const appliedAt = new Date().toISOString();

  const safeName = escapeHtml(form.name);
  const safeOrg = escapeHtml(form.org);
  const safeEmail = escapeHtml(form.email.toLowerCase());
  const safeRole = escapeHtml(form.role || '(not specified)');
  const safeMessage = escapeHtml(form.message || '(none)');
  const safeStatus = provisioned.autoProvisioned ? 'Auto-provisioned' : 'Manual follow-up required';
  const safeReason = escapeHtml(provisioned.reason || 'Provisioned successfully.');
  const safeApiKey = escapeHtml(provisioned.api_key || '(not issued)');
  const safeFunderId = escapeHtml(provisioned.funder_id || '(not issued)');

  const htmlContent = `
    <div style="font-family:Inter,Arial,sans-serif;color:#0A0F1A;line-height:1.6;max-width:560px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#003A8C,#D4AF37);border-radius:12px;padding:20px 28px;margin-bottom:20px;">
        <div style="font-size:18px;font-weight:800;color:#fff;">New funder API application</div>
        <div style="color:#fff;font-size:13px;margin-top:4px;opacity:.85;">${appliedAt}</div>
      </div>

      <div style="background:#fff;border-radius:12px;padding:28px;border:1px solid #E2E8F0;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px 0;color:#64748B;font-weight:600;width:130px;border-bottom:1px solid #F1F5F9;">Name</td><td style="padding:8px 0;color:#0A0F1A;border-bottom:1px solid #F1F5F9;">${safeName}</td></tr>
          <tr><td style="padding:8px 0;color:#64748B;font-weight:600;border-bottom:1px solid #F1F5F9;">Organization</td><td style="padding:8px 0;color:#0A0F1A;border-bottom:1px solid #F1F5F9;">${safeOrg}</td></tr>
          <tr><td style="padding:8px 0;color:#64748B;font-weight:600;border-bottom:1px solid #F1F5F9;">Email</td><td style="padding:8px 0;border-bottom:1px solid #F1F5F9;"><a href="mailto:${safeEmail}" style="color:#003A8C;">${safeEmail}</a></td></tr>
          <tr><td style="padding:8px 0;color:#64748B;font-weight:600;border-bottom:1px solid #F1F5F9;">Role</td><td style="padding:8px 0;color:#0A0F1A;border-bottom:1px solid #F1F5F9;">${safeRole}</td></tr>
          <tr><td style="padding:8px 0;color:#64748B;font-weight:600;border-bottom:1px solid #F1F5F9;">Provisioning</td><td style="padding:8px 0;color:#0A0F1A;border-bottom:1px solid #F1F5F9;">${safeStatus}</td></tr>
          <tr><td style="padding:8px 0;color:#64748B;font-weight:600;border-bottom:1px solid #F1F5F9;">Reason</td><td style="padding:8px 0;color:#0A0F1A;border-bottom:1px solid #F1F5F9;">${safeReason}</td></tr>
          <tr><td style="padding:8px 0;color:#64748B;font-weight:600;border-bottom:1px solid #F1F5F9;">Brevo contact</td><td style="padding:8px 0;color:#0A0F1A;border-bottom:1px solid #F1F5F9;">${brevoContactSaved ? 'Saved' : 'Failed'}</td></tr>
          <tr><td style="padding:8px 0;color:#64748B;font-weight:600;border-bottom:1px solid #F1F5F9;">Funder ID</td><td style="padding:8px 0;color:#0A0F1A;border-bottom:1px solid #F1F5F9;"><code>${safeFunderId}</code></td></tr>
          <tr><td style="padding:8px 0;color:#64748B;font-weight:600;">API Key</td><td style="padding:8px 0;color:#0A0F1A;"><code>${safeApiKey}</code></td></tr>
        </table>

        <div style="margin-top:20px;padding-top:16px;border-top:1px solid #F1F5F9;">
          <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Applicant message</div>
          <p style="margin:0;color:#334155;font-size:14px;white-space:pre-wrap;">${safeMessage}</p>
        </div>
      </div>
    </div>
  `;

  return sendBrevoEmail({
    sender: { email: fromEmail, name: 'TGM Alerts' },
    to: [{ email: adminEmail, name: 'TGM Admin' }],
    replyTo: { email: form.email.toLowerCase(), name: form.name },
    subject: `[TGM] New funder API application - ${form.org}`,
    htmlContent,
  }, brevoApiKey);
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

  const form = {
    name: name.trim(),
    org: org.trim(),
    email: email.trim(),
    role: role.trim(),
    message: message.trim(),
    source: String(source || 'funder-api-request').trim() || 'funder-api-request',
  };

  if (!form.name) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  if (!form.org) {
    return res.status(400).json({ error: 'Organization is required.' });
  }
  if (!form.email || !isValidEmail(form.email)) {
    return res.status(400).json({ error: 'A valid work email is required.' });
  }

  const brevoApiKey = process.env.BREVO_API_KEY;
  if (!brevoApiKey) {
    console.error('[FUNDER-API REQUEST] BREVO_API_KEY not configured');
    return res.status(503).json({ error: 'Funder intake is not configured. Please email support@thegrantsmaster.com directly.' });
  }

  console.log('[FUNDER-API REQUEST]', {
    name: form.name,
    org: form.org,
    email: form.email.toLowerCase(),
    role: form.role || '(not specified)',
    source: form.source,
    at: new Date().toISOString(),
  });

  try {
    let provisioned;
    try {
      provisioned = await provisionFunderAccount(form);
    } catch (error) {
      console.error('[FUNDER-API REQUEST] Sidecar provisioning error:', error.message);
      provisioned = {
        autoProvisioned: false,
        reason: error.message,
        baseUrl: getFunderApiBaseUrl(),
        funder_id: null,
        api_key: null,
        plan_tier: null,
      };
    }

    const contactResult = await upsertBrevoContact(form, brevoApiKey);
    if (!contactResult.saved) {
      console.error('[FUNDER-API REQUEST] Brevo contact error:', contactResult.error);
    }

    const emailResults = await Promise.all([
      sendOnboardingPacket(form, provisioned, brevoApiKey),
      sendAdminAlert(form, provisioned, contactResult.saved, brevoApiKey),
    ]);

    const packetResult = emailResults[0];
    const adminResult = emailResults[1];

    if (!packetResult.sent) {
      console.error('[FUNDER-API REQUEST] Onboarding packet error:', packetResult.error);
    }
    if (!adminResult.sent) {
      console.error('[FUNDER-API REQUEST] Admin alert error:', adminResult.error);
    }

    if (!contactResult.saved && !packetResult.sent && !adminResult.sent) {
      return res.status(502).json({ error: 'Failed to submit. Please email support@thegrantsmaster.com directly.' });
    }

    return res.status(packetResult.sent ? 200 : 202).json({
      success: true,
      autoProvisioned: provisioned.autoProvisioned,
      onboardingPacketSent: packetResult.sent,
      adminAlertSent: adminResult.sent,
      warning: packetResult.sent
        ? (provisioned.autoProvisioned ? null : 'Application received. Admin follow-up is still required to finish key provisioning.')
        : 'Application received, but onboarding email failed. We will follow up manually.',
    });
  } catch (error) {
    console.error('[FUNDER-API REQUEST] Unexpected error:', error);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

module.exports = router;