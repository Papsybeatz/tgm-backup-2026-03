const express = require('express');
const https = require('https');
const router = express.Router();

const DEFAULT_CONTACT_TO_EMAIL = 'support@thegrantsmaster.com';
const DEFAULT_CONTACT_FROM_EMAIL = 'noreply@thegrantsmaster.com';

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function brevoSend(payload, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request(
      {
        hostname: 'api.brevo.com',
        path: '/v3/smtp/email',
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ ok: true });
          } else {
            reject(new Error('Brevo ' + res.statusCode + ': ' + data.slice(0, 200)));
          }
        });
      }
    );
    req.setTimeout(12000, () => {
      req.destroy();
      reject(new Error('Brevo request timed out after 12s'));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message, honeypot } = req.body || {};

    // Spam trap
    if (honeypot && String(honeypot).trim() !== '') {
      return res.status(200).json({ success: true });
    }

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required.' });
    }

    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.error('[CONTACT] BREVO_API_KEY not configured');
      return res.status(503).json({ success: false, message: 'Contact delivery is not configured. Please email support@thegrantsmaster.com directly.' });
    }

    const toEmail  = process.env.CONTACT_TO_EMAIL  || DEFAULT_CONTACT_TO_EMAIL;
    const fromEmail = process.env.BREVO_FROM_EMAIL || DEFAULT_CONTACT_FROM_EMAIL;

    const safeName    = escapeHtml(name);
    const safeEmail   = escapeHtml(email);
    const safeSubject = escapeHtml(subject || '');
    const safeMessage = escapeHtml(message);

    await brevoSend(
      {
        sender:  { name: 'GrantsMaster Contact Form', email: fromEmail },
        to:      [{ email: toEmail, name: 'GrantsMaster Support' }],
        replyTo: { email, name },
        subject: subject ? '[Contact] ' + subject : '[Contact] Message from ' + name,
        htmlContent: `
          <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#F7F9FB;">
            <div style="background:linear-gradient(135deg,#0A0F1A,#003A8C);border-radius:12px;padding:24px;margin-bottom:24px;">
              <div style="font-weight:800;font-size:18px;color:#D4AF37;">GrantsMaster</div>
              <div style="color:#fff;font-size:14px;margin-top:4px;opacity:.8;">New contact form submission</div>
            </div>
            <div style="background:#fff;border-radius:12px;padding:28px;border:1px solid #E2E8F0;">
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tr><td style="padding:8px 0;color:#64748B;font-weight:600;width:100px;">Name</td><td style="padding:8px 0;color:#1A202C;">${safeName}</td></tr>
                <tr><td style="padding:8px 0;color:#64748B;font-weight:600;">Email</td><td style="padding:8px 0;color:#1A202C;"><a href="mailto:${safeEmail}" style="color:#003A8C;">${safeEmail}</a></td></tr>
                <tr><td style="padding:8px 0;color:#64748B;font-weight:600;">Subject</td><td style="padding:8px 0;color:#1A202C;">${safeSubject || '&mdash;'}</td></tr>
              </table>
              <hr style="border:none;border-top:1px solid #E2E8F0;margin:20px 0;">
              <p style="color:#64748B;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin:0 0 10px;">Message</p>
              <p style="color:#1A202C;font-size:15px;line-height:1.7;margin:0;white-space:pre-wrap;">${safeMessage}</p>
            </div>
            <p style="color:#94A3B8;font-size:12px;text-align:center;margin-top:20px;">Reply directly to this email to respond to ${safeName}.</p>
          </div>
        `,
      },
      apiKey
    );

    console.log('[CONTACT] Message from ' + email + ' delivered via Brevo');
    return res.json({ success: true });

  } catch (err) {
    console.error('[CONTACT] Error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to send message. Please email support@thegrantsmaster.com directly.',
    });
  }
});

module.exports = router;
