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
/**
 * Build a Brevo recipient object.
 *
 * Brevo rejects the whole send with "name is missing in to" when the name is
 * blank, and an account whose user has no display name hits that every time.
 * Every sender in the app must go through this so the rule cannot drift — two
 * of them used to build the recipient by hand and omitted the name entirely.
 *
 * @returns {{email: string, name: string}|null} null when there is no address
 */
function buildRecipient(email, name) {
  const recipientEmail = String(email || '').trim().toLowerCase();
  if (!recipientEmail) return null;
  const recipientName = String(name || '').trim() || recipientEmail.split('@')[0] || 'there';
  return { email: recipientEmail, name: recipientName };
}

async function sendBrevoEmail({ to, toName = '', subject, htmlContent, apiKey, attachments }) {
  const key = apiKey || process.env.BREVO_API_KEY;
  if (!key) {
    return { sent: false, error: 'BREVO_API_KEY not set' };
  }

  const fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@thegrantsmaster.com';
  const fromName = process.env.BREVO_FROM_NAME || 'The Grants Master';

  const recipient = buildRecipient(to, toName);
  if (!recipient) {
    return { sent: false, error: 'No recipient email address supplied' };
  }

  try {
    const res = await fetch(BREVO_SMTP_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': key },
      body: JSON.stringify({
        sender: { email: fromEmail, name: fromName || 'The Grants Master' },
        to: [recipient],
        subject,
        htmlContent,
        ...(Array.isArray(attachments) && attachments.length ? { attachment: attachments } : {}),
      }),
    });

    if (res.status >= 200 && res.status < 300) {
      return { sent: true };
    }
    const body = await res.text();
    const error = `Brevo SMTP ${res.status}: ${body.slice(0, 300)}`;
    // Log centrally. Most callers fire-and-forget with .catch(() => {}), which
    // is how a broken sender went unnoticed across invites and billing email.
    console.error('[brevo] send failed:', error);
    return { sent: false, error };
  } catch (err) {
    console.error('[brevo] send error:', err?.message || err);
    return { sent: false, error: err.message || 'Network error' };
  }
}

module.exports = { sendBrevoEmail, buildRecipient };
