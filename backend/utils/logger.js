// Lightweight structured logger — writes to console + in-memory ring buffer
// for the admin /api/admin/metrics endpoint to surface recent errors.

const ERROR_BUFFER = [];
const AI_BUFFER = [];
const MAX_BUFFER = 200;

function push(buf, entry) {
  buf.unshift(entry);
  if (buf.length > MAX_BUFFER) buf.pop();
}

function logError(context, error, meta = {}) {
  const entry = {
    ts: new Date().toISOString(),
    context,
    message: error?.message || String(error),
    stack: error?.stack || null,
    ...meta,
  };
  push(ERROR_BUFFER, entry);
  console.error(`[ERROR][${context}]`, entry.message, meta);
}

function logAiAction(action, meta = {}) {
  const entry = {
    ts: new Date().toISOString(),
    action,
    ...meta,
  };
  push(AI_BUFFER, entry);
  console.log(`[AI][${action}]`, JSON.stringify(meta));
}

function getRecentErrors(limit = 50) {
  return ERROR_BUFFER.slice(0, limit);
}

function getRecentAiActions(limit = 50) {
  return AI_BUFFER.slice(0, limit);
}

module.exports = { logError, logAiAction, getRecentErrors, getRecentAiActions };
