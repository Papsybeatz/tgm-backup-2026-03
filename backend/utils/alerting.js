// backend/utils/alerting.js
//
// Throttled alerting for server errors.
//
// The throttle is the whole point. An unthrottled alerter is worse than no
// alerter: one failure inside a loop sends thousands of emails, the channel
// gets muted, and from then on nobody is watching — while believing they are.
//
// So alerts are keyed by fingerprint (path + status + message) and at most one
// email per fingerprint per window goes out. The dashboard still records every
// occurrence; only the email is throttled.

const { sendBrevoEmail } = require('./brevo');

const THROTTLE_MS = Number(process.env.ALERT_THROTTLE_MS || 60 * 60 * 1000); // 1 hour
const MAX_TRACKED = 500;
const lastSentAt = new Map();

/** True when this fingerprint has not alerted inside the window. Records the send. */
function shouldSend(fingerprint, now = Date.now()) {
  const key = fingerprint || 'unknown';

  // `has` rather than a falsy default: treating "never sent" as epoch 0 would
  // throttle anything asked about before the first window had elapsed.
  if (lastSentAt.has(key) && now - lastSentAt.get(key) < THROTTLE_MS) return false;

  lastSentAt.set(key, now);
  if (lastSentAt.size > MAX_TRACKED) {
    for (const [k, when] of lastSentAt) {
      if (now - when > THROTTLE_MS) lastSentAt.delete(k);
    }
  }
  return true;
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function dashboardUrl() {
  const base = String(process.env.APP_URL || 'https://www.thegrantsmaster.com').replace(/\/+$/, '');
  return `${base}/admin/monitoring`;
}

function buildAlertHtml(entry = {}) {
  const row = (label, value) => (
    value === null || value === undefined || value === ''
      ? ''
      : `<tr><td style="padding:4px 12px 4px 0;color:#64748B;font-size:13px;">${esc(label)}</td><td style="padding:4px 0;color:#0A0F1A;font-size:13px;font-weight:600;">${esc(value)}</td></tr>`
  );

  return `
    <div style="font-family:Inter,sans-serif;max-width:620px;margin:0 auto;background:#F7F9FB;padding:32px 24px;">
      <div style="background:#0A0F1A;border-radius:12px;padding:20px 24px;margin-bottom:20px;">
        <div style="color:#F87171;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px;">
          Server error
        </div>
        <div style="color:#fff;font-size:18px;font-weight:800;">
          ${esc(entry.status || 500)} ${esc(entry.method || '')} ${esc(entry.path || entry.endpoint || '')}
        </div>
      </div>
      <div style="background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:20px 24px;">
        <table style="border-collapse:collapse;width:100%;">
          ${row('Message', entry.message)}
          ${row('Tier', entry.tier)}
          ${row('Account', entry.userEmail)}
          ${row('Source', entry.source)}
          ${row('Request id', entry.requestId)}
          ${row('Fingerprint', entry.fingerprint)}
          ${row('When', entry.createdAt ? new Date(entry.createdAt).toISOString() : new Date().toISOString())}
        </table>
        <p style="margin:20px 0 0;">
          <a href="${esc(dashboardUrl())}" style="display:inline-block;background:#D4AF37;color:#0A0F1A;border-radius:8px;padding:11px 18px;font-weight:800;font-size:14px;text-decoration:none;">
            Open the monitoring dashboard →
          </a>
        </p>
        <p style="color:#94A3B8;font-size:12px;margin:16px 0 0;">
          One email per distinct failure per hour. Every occurrence is still recorded on the dashboard.
        </p>
      </div>
    </div>
  `;
}

/**
 * Email the founder about a server error, at most once per fingerprint per
 * window. Never throws — alerting must not be able to break the request path.
 */
async function alertOnServerError(entry) {
  try {
    if (!entry) return { sent: false, reason: 'no_entry' };

    const to = process.env.ALERT_EMAIL || process.env.FOUNDER_EMAIL || 'clotteythomas41@gmail.com';
    if (!process.env.BREVO_API_KEY) {
      console.warn('[ALERT] suppressed (BREVO_API_KEY unset):', entry.message);
      return { sent: false, reason: 'no_api_key' };
    }
    if (!shouldSend(entry.fingerprint)) return { sent: false, reason: 'throttled' };

    const label = `${entry.status || 500} ${entry.path || entry.endpoint || 'unknown'}`;
    return await sendBrevoEmail({
      to,
      toName: 'Founder',
      subject: `[TGM] Server error: ${label}`,
      htmlContent: buildAlertHtml(entry),
    });
  } catch (error) {
    console.error('[ALERT] failed:', error?.message || error);
    return { sent: false, reason: 'exception' };
  }
}

module.exports = {
  alertOnServerError,
  shouldSend,
  buildAlertHtml,
  THROTTLE_MS,
  _resetThrottle: () => lastSentAt.clear(),
};
