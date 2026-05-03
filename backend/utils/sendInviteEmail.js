const https = require('https');

async function sendInviteEmail(email, inviterName, inviteLink) {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.BREVO_FROM_EMAIL || 'noreply@thegrantsmaster.com';
  const fromName = process.env.BREVO_FROM_NAME || 'GrantsMaster';

  if (!apiKey) {
    console.log(`[EMAIL STUB] Invite to ${email} from ${inviterName}. Link: ${inviteLink}`);
    return true;
  }

  const payload = JSON.stringify({
    sender: { name: fromName, email: from },
    to: [{ email }],
    subject: `${inviterName} invited you to GrantsMaster`,
    htmlContent: `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#F7F9FB;padding:40px 24px;">
        <div style="background:linear-gradient(135deg,#0A0F1A,#003A8C);border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
          <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#D4AF37,#E8D28C);display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;color:#0A0F1A;margin-bottom:16px;">GM</div>
          <h1 style="color:#fff;font-size:24px;font-weight:800;margin:0 0 8px;">You're invited to GrantsMaster</h1>
          <p style="color:#E8D28C;margin:0;font-size:15px;">${inviterName} has invited you to collaborate</p>
        </div>
        <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #E2E8F0;">
          <p style="color:#1A202C;font-size:15px;line-height:1.6;margin:0 0 24px;">
            You've been invited to join a workspace on GrantsMaster — the AI-powered grant writing platform trusted by nonprofits and agencies worldwide.
          </p>
          <a href="${inviteLink}" style="display:block;text-align:center;padding:14px 24px;background:#D4AF37;color:#0A0F1A;border-radius:10px;font-weight:700;font-size:16px;text-decoration:none;">
            Accept Invitation →
          </a>
          <p style="color:#64748B;font-size:12px;margin:20px 0 0;text-align:center;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[EMAIL] Invite sent to ${email} via Brevo`);
          resolve(true);
        } else {
          console.error('[EMAIL] Brevo error:', res.statusCode, body);
          reject(new Error('Failed to send invite email'));
        }
      });
    });
    req.on('error', (err) => {
      console.error('[EMAIL] Brevo request error:', err.message);
      reject(new Error('Failed to send invite email'));
    });
    req.write(payload);
    req.end();
  });
}

module.exports = sendInviteEmail;
