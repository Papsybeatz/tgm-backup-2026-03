// backend/utils/logging.js
//
// The single failure-capture entry point.
//
// There used to be two loggers that disagreed: utils/logger.js kept a 200-entry
// in-memory ring buffer (wired into four AI routes, lost on every restart), and
// this file wrote to the ErrorLog table but its logError was called from
// nowhere. So the persisted table stayed empty and the failures that were
// captured died with the process.
//
// Now every failure goes through captureError and lands in the database with
// enough context to act on: which account, which tier, which endpoint, which
// request, and why.

const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const { getRequestContext } = require('../middleware/requestContext');
const { alertOnServerError } = require('./alerting');

const SEVERITIES = new Set(['critical', 'error', 'warning', 'info']);
const MAX_MESSAGE = 2000;
const MAX_STACK = 8000;
const MAX_STRING = 1000;
const MAX_META_BYTES = 4000;
const MAX_ARRAY = 50;

// Anything whose key looks like a credential is replaced, never stored.
const SECRET_KEY_RE = /(pass|secret|token|auth|cookie|session|api[-_]?key|credential|bearer)/i;

/** Deep-copy a value with credential-shaped keys removed and strings capped. */
function redact(value, depth = 0) {
  if (value === null || value === undefined) return value;
  if (depth > 4) return '[truncated]';

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY).map((item) => redact(item, depth + 1));
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = SECRET_KEY_RE.test(key) ? '[redacted]' : redact(val, depth + 1);
    }
    return out;
  }
  if (typeof value === 'string') {
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  }
  return value;
}

/** Redacted meta, capped so one bad entry cannot bloat the row. */
function safeMeta(meta) {
  if (!meta || typeof meta !== 'object') return null;
  try {
    const cleaned = redact(meta);
    const json = JSON.stringify(cleaned);
    if (json.length <= MAX_META_BYTES) return cleaned;
    return { truncated: true, preview: json.slice(0, MAX_META_BYTES) };
  } catch {
    return { note: 'meta could not be serialised' };
  }
}

/**
 * A stable identity for "the same failure".
 *
 * Groups occurrences and drives alert throttling, so path + status + the first
 * part of the message — not the whole message, which often carries ids.
 */
function fingerprintOf({ path, status, message }) {
  return crypto
    .createHash('sha256')
    .update(`${path || ''}|${status || ''}|${String(message || '').slice(0, 200)}`)
    .digest('hex')
    .slice(0, 32);
}

/**
 * Record a failure. Never throws — capture must not be able to break the path
 * it is observing.
 *
 * @returns {Promise<object|null>} the stored row, or null if capture failed
 */
async function captureError(input = {}) {
  try {
    const ctx = getRequestContext() || {};
    const err = input.error;

    const rawMessage = input.message || err?.message || 'Unknown error';
    const message = String(rawMessage).slice(0, MAX_MESSAGE);
    const severity = SEVERITIES.has(input.severity) ? input.severity : 'error';

    const path = input.path || ctx.path || null;
    const status = Number.isInteger(input.status) ? input.status : null;

    const stack = err?.stack || input.stack || null;

    const entry = {
      severity,
      source: input.source || 'app',
      message,
      stack: stack ? String(stack).slice(0, MAX_STACK) : null,
      status,
      method: input.method || ctx.method || null,
      path,
      endpoint: input.endpoint || path,
      userId: input.userId || ctx.userId || null,
      userEmail: input.userEmail || ctx.userEmail || null,
      tier: input.tier || ctx.tier || null,
      requestId: input.requestId || ctx.requestId || null,
      meta: safeMeta(input.meta),
      fingerprint: fingerprintOf({ path, status, message }),
    };

    const row = await prisma.errorLog.create({ data: entry });

    // Email only for real server-side failures. A 401 or a 404 is usually
    // correct behaviour, and alerting on those would bury the real ones.
    if (status === null || status >= 500 || severity === 'critical') {
      alertOnServerError(entry).catch(() => {});
    }

    return row;
  } catch (error) {
    // Last resort: the capture path itself failed. Console only, never throw.
    console.error('[LOGGING] capture failed:', error?.message || error);
    return null;
  }
}

/**
 * Back-compatible logError.
 *
 * Two callers disagreed on the shape, so both are accepted:
 *   logError('AI_DRAFT', err, { email })        // context, error, meta
 *   logError(message, endpoint, userId, sev)    // message, endpoint, userId, severity
 */
function logError(a, b, c, d) {
  const looksLikeError = b instanceof Error || (b && typeof b === 'object' && typeof b.message === 'string');

  if (looksLikeError) {
    const meta = c && typeof c === 'object' ? c : {};
    return captureError({
      source: 'app',
      message: `${a}: ${b.message}`,
      error: b,
      userEmail: meta.email || null,
      meta,
    });
  }

  return captureError({
    source: 'app',
    message: a,
    endpoint: typeof b === 'string' ? b : null,
    path: typeof b === 'string' ? b : null,
    userId: typeof c === 'string' ? c : null,
    severity: typeof d === 'string' ? d : 'error',
  });
}

/**
 * Back-compatible logAiAction — also two shapes:
 *   logAiAction('draft_generated', { email })   // action, meta
 *   logAiAction(userId, 'generate')             // userId, action
 */
async function logAiAction(a, b) {
  try {
    let userId = null;
    let action = null;
    let meta = {};

    if (typeof b === 'string') {
      userId = a || null;
      action = b;
    } else {
      action = a;
      meta = b && typeof b === 'object' ? b : {};
    }

    // The AI routes pass an email rather than an id; resolve it so the log is
    // actually attributable to an account.
    if (!userId && meta.email) {
      const user = await prisma.user.findUnique({
        where: { email: String(meta.email) },
        select: { id: true },
      });
      userId = user?.id || null;
    }

    if (!action) return null;
    return await prisma.aiLog.create({ data: { userId, action: String(action) } });
  } catch (error) {
    console.error('[LOGGING] ai action failed:', error?.message || error);
    return null;
  }
}

module.exports = {
  captureError,
  logError,
  logAiAction,
  redact,
  safeMeta,
  fingerprintOf,
};
