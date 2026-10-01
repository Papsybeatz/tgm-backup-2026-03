// backend/middleware/requestContext.js
//
// One id per request, and a place for the request's identity to live.
//
// This is the seam that makes failure capture scale: the logger does not need
// every caller to hand it a request id, a path, or a user. Those flow in
// automatically, so a failure captured deep inside a route still knows which
// request it belonged to.
//
// AsyncLocalStorage is what lets a capture happening several awaits deep still
// see the request it came from.

const { AsyncLocalStorage } = require('async_hooks');
const crypto = require('crypto');

const storage = new AsyncLocalStorage();

/** Path without the query string — query values can carry tokens. */
function cleanPath(req) {
  const raw = req.originalUrl || req.url || req.path || '';
  return String(raw).split('?')[0];
}

function requestContext(req, res, next) {
  const incoming = String(req.headers['x-request-id'] || '').trim();
  const requestId = incoming && incoming.length <= 128 ? incoming : crypto.randomUUID();

  const ctx = {
    requestId,
    method: req.method,
    path: cleanPath(req),
    userId: null,
    userEmail: null,
    tier: null,
  };

  // Exposed on req as well, so the error handler can read it directly.
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  storage.run(ctx, () => next());
}

/** The current request's context, or null outside a request. */
function getRequestContext() {
  return storage.getStore() || null;
}

/**
 * Attach the authenticated identity to the current request.
 *
 * Called by the auth middleware once a session resolves, so that any failure
 * captured afterwards is attributed to the right account and tier without the
 * caller passing either.
 */
function setRequestUser(user) {
  const ctx = storage.getStore();
  if (!ctx || !user) return;
  ctx.userId = user.id || null;
  ctx.userEmail = user.email || null;
  ctx.tier = user.tier || null;
}

module.exports = { requestContext, getRequestContext, setRequestUser };
