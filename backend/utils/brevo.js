/**
 * backend/utils/brevo.js
 *
 * Shared Brevo email helper. All transactional emails sent via Brevo SMTP
 * should route through sendBrevoEmail() so auth headers, error handling, and
 * logging are consistent across routes.
 */

const BREVO_SMTP_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Send a single transactional email via Brevo SMTP API.
 *
 * @param {object} opts
 * @param {string} opts.to          - Recipient email address
 * @param {string} opts.toName      - Recipient display name
 * @param {string} opts.subject     - Email subject line
 * @param {string} opts.htmlContent - Full HTML body
 * @param {string} [opts.apiKey]    - Override BREVO_API_KEY (default: env var)
 * @returns {{ sent: boolean, error?: string }}
 */
async function sendBrevoEmail({ to, toName = '', subject, htmlContent, apiKey }) {
  const key = apiKey || process.env.BREVO_API_KEY;
  if (!key) {
    return { sent: false, error: 'BREVO_API_KEY not set' };
  }

  const fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@thegrantsmaster.com';
  const fromName = process.env.BREVO_FROM_NAME || 'The Grants Master';

  try {
    const res = await fetch(BREVO_SMTP_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': key },
      body: JSON.stringify({
        sender: { email: fromEmail, name: fromName },
        to: [{ email: to.trim().toLowerCase(), name: toName.trim() }],
        subject,
        htmlContent,
      }),
    });

    if (res.status >= 200 && res.status < 300) {
      return { sent: true };
    }
    const body = await res.text();
    return { sent: false, error: `Brevo SMTP ${res.status}: ${body.slice(0, 300)}` };
  } catch (err) {
    return { sent: false, error: err.message || 'Network error' };
  }
}

module.exports = { sendBrevoEmail };
