const express = require('express');
const https = require('https');
const router = express.Router();

router.post('/', async (req, res) => {
  const { name, email, subject, message, honeypot } = req.body;

  if (honeypot && honeypot.trim() !== '') {
    return res.status(200).json({ success: true });
  }

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    console.log(`[CONTACT STUB] From: ${name} <${email}> | ${message}`);
    return res.json({ success: true });
  }

  const payload = JSON.stringify({
    sender: { name: 'GrantsMaster Contact Form', email: 'noreply@thegrantsmaster.com' },
    to: [{ email: 'tcaibiznes@gmail.com', name: 'GrantsMaster Support' }],
    replyTo: { email, name },
    subject: subject ? `[Contact] ${subject}` : `[Contact] Message from ${name}`,
    htmlContent: `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#F7F9FB;">
        <div style="background:linear-gradient(135deg,#0A0F1A,#003A8C);border-radius:12px;padding:24px;margin-bottom:24px;">
          <div style="font-weight:800;font-size:18px;color:#D4AF37;">GrantsMaster</div>
          <div style="color:#fff;font-size:14px;margin-top:4px;opacity:.8;">New contact form submission</div>
        </div>
        <div style="background:#fff;border-radius:12px;padding:28px;border:1px solid #E2E8F0;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:8px 0;color:#64748B;font-weight:600;width:100px;">Name</td><td style="padding:8px 0;color:#1A202C;">${name}</td></tr>
            <tr><td style="padding:8px 0;color:#64748B;font-weight:600;">Email</td><td style="padding:8px 0;color:#1A202C;"><a href="mailto:${email}" style="color:#003A8C;">${email}</a></td></tr>
            <tr><td style="padding:8px 0;color:#64748B;font-weight:600;">Subject</td><td style="padding:8px 0;color:#1A202C;">${subject || '—'}</td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #E2E8F0;margin:20px 0;">
          <p style="color:#64748B;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin:0 0 10px;">Message</p>
          <p style="color:#1A202C;font-size:15px;line-height:1.7;margin:0;white-space:pre-wrap;">${message}</p>
        </div>
        <p style="color:#94A3B8;font-size:12px;text-align:center;margin-top:20px;">Reply directly to this email to respond to ${name}.</p>
      </div>
    `,
  });

  return new Promise((resolve) => {
    const req2 = https.request({
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
          console.log(`[CONTACT] Message from ${email} delivered via Brevo`);
          res.json({ success: true });
        } else {
          console.error('[CONTACT] Brevo error:', response.statusCode, body);
          res.status(500).json({ success: false, message: 'Failed to send message.' });
        }
        resolve();
      });
    });
    req2.on('error', (err) => {
      console.error('[CONTACT] Request error:', err.message);
      res.status(500).json({ success: false, message: 'Failed to send message.' });
      resolve();
    });
    req2.write(payload);
    req2.end();
  });
});

module.exports = router;
