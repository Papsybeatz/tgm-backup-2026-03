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
 * @param {Array<{content: string, name: string}>} [opts.attachments] - base64 attachments
 * @returns {{ sent: boolean, error?: string }}
 */
async function sendBrevoEmail({ to, toName = '', subject, htmlContent, apiKey, attachments }) {
  const key = apiKey || process.env.BREVO_API_KEY;
  if (!key) {
    return { sent: false, error: 'BREVO_API_KEY not set' };
  }

  const fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@thegrantsmaster.com';
  const fromName = process.env.BREVO_FROM_NAME || 'The Grants Master';

  const recipientEmail = String(to || '').trim().toLowerCase();
  if (!recipientEmail) {
    return { sent: false, error: 'No recipient email address supplied' };
  }

  // Brevo rejects the whole send with "name is missing in to" when the
  // recipient name is blank, and an account without a display name hits that
  // every time. Fall back to the address's local part so a name is always sent.
  const recipientName = String(toName || '').trim() || recipientEmail.split('@')[0] || 'there';

  try {
    const res = await fetch(BREVO_SMTP_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': key },
      body: JSON.stringify({
        sender: { email: fromEmail, name: fromName || 'The Grants Master' },
        to: [{ email: recipientEmail, name: recipientName }],
        subject,
        htmlContent,
        ...(Array.isArray(attachments) && attachments.length ? { attachment: attachments } : {}),
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
