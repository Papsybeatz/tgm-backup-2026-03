/**
 * Failure-capture tests
 * ----------------------------------------------------------------------------
 * Guards the observability layer added for launch: one capture entry point that
 * persists to ErrorLog with enough context to act on, a global error handler,
 * process guards, and alerts that cannot flood the inbox.
 *
 * The bugs this exists for: before it, a 500 on any route was recorded nowhere
 * (no global handler), the persisted ErrorLog table was written to by nothing,
 * and the only logger in use kept 200 entries in memory that died on every
 * Railway restart.
 *
 * Run: cd backend && npm run test:observability
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { redact, safeMeta, fingerprintOf, captureError } = require('../utils/logging');
const { shouldSend, buildAlertHtml, _resetThrottle, THROTTLE_MS } = require('../utils/alerting');

const ROOT = path.join(__dirname, '..');
const SERVER_SRC = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');

/* ───────────────────────────── redaction ───────────────────────────── */

test('redact removes credential-shaped keys at any depth', () => {
  const out = redact({
    email: 'a@b.com',
    authorization: 'Bearer abc',
    nested: { password: 'hunter2', apiKey: 'sk-123', cookie: 'session=xyz' },
    list: [{ token: 't', keep: 'yes' }],
  });

  assert.equal(out.email, 'a@b.com');
  assert.equal(out.authorization, '[redacted]');
  assert.equal(out.nested.password, '[redacted]');
  assert.equal(out.nested.apiKey, '[redacted]');
  assert.equal(out.nested.cookie, '[redacted]');
  assert.equal(out.list[0].token, '[redacted]');
  assert.equal(out.list[0].keep, 'yes', 'non-secret keys must survive');
});

test('redact caps long strings rather than storing them whole', () => {
  const out = redact({ body: 'x'.repeat(5000) });
  assert.ok(out.body.length < 1100);
});

/* ───────────────────────────── meta cap ───────────────────────────── */

test('safeMeta passes small meta through unchanged', () => {
  assert.deepEqual(safeMeta({ a: 1, b: 'two' }), { a: 1, b: 'two' });
});

test('safeMeta truncates oversized meta instead of bloating the row', () => {
  // Many keys, because redact already caps any single long string — the cap
  // that matters here is the total size of the object.
  const manyKeys = {};
  for (let i = 0; i < 500; i += 1) manyKeys[`key_${i}`] = 'x'.repeat(50);

  const out = safeMeta(manyKeys);
  assert.equal(out.truncated, true);
  assert.ok(JSON.stringify(out).length < 5000);
});

test('safeMeta returns null for non-objects', () => {
  assert.equal(safeMeta(null), null);
  assert.equal(safeMeta('nope'), null);
});

/* ─────────────────────────── fingerprinting ─────────────────────────── */

test('fingerprintOf is stable, and distinguishes different failures', () => {
  const base = fingerprintOf({ path: '/api/team/add', status: 500, message: 'boom' });

  assert.equal(base, fingerprintOf({ path: '/api/team/add', status: 500, message: 'boom' }));
  assert.notEqual(base, fingerprintOf({ path: '/api/team/add', status: 500, message: 'bang' }));
  assert.notEqual(base, fingerprintOf({ path: '/api/team/add', status: 502, message: 'boom' }));
  assert.notEqual(base, fingerprintOf({ path: '/api/team/remove', status: 500, message: 'boom' }));
});

/* ───────────────────────────── throttling ───────────────────────────── */

test('alerts throttle per fingerprint, not globally', () => {
  _resetThrottle();
  assert.equal(shouldSend('fp-1'), true, 'first occurrence alerts');
  assert.equal(shouldSend('fp-1'), false, 'the same failure must not alert again');
  assert.equal(shouldSend('fp-2'), true, 'a different failure still alerts');
});

test('the throttle window expires', () => {
  _resetThrottle();
  const t0 = Date.now();
  assert.equal(shouldSend('fp', t0), true, 'first send goes out');
  assert.equal(shouldSend('fp', t0 + THROTTLE_MS - 1), false, 'still inside the window');
  assert.equal(shouldSend('fp', t0 + THROTTLE_MS + 1), true, 'window elapsed, so it alerts again');
});

test('a never-seen fingerprint is not throttled by an epoch default', () => {
  _resetThrottle();
  // Regression: treating "never sent" as 0 would suppress any alert asked
  // about before the window had elapsed since epoch.
  assert.equal(shouldSend('brand-new', 1), true);
});

/* ───────────────────────────── alert content ───────────────────────────── */

test('the alert email carries the context needed to act on it', () => {
  const html = buildAlertHtml({
    status: 500,
    method: 'POST',
    path: '/api/team/add',
    message: 'insert failed',
    tier: 'agency_starter',
    userEmail: 'owner@example.com',
    requestId: 'req-123',
    fingerprint: 'fp-1',
  });

  assert.match(html, /500/);
  assert.match(html, /agency_starter/, 'the tier is the point of the alert');
  assert.match(html, /req-123/);
  assert.match(html, /owner@example\.com/);
  assert.match(html, /admin\/monitoring/);
});

test('the alert email escapes its content instead of injecting it', () => {
  const html = buildAlertHtml({ message: '<script>alert(1)</script>', path: '/x' });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

/* ───────────────────────── capture never breaks the path ───────────────────────── */

test('captureError resolves rather than throwing when the write cannot succeed', { timeout: 20000 }, async () => {
  // There is no database in this environment, so the write must fail. The
  // contract is that capture fails QUIETLY: an observability layer that can
  // break the request it is observing is worse than none.
  const result = await captureError({ message: 'test failure', source: 'test' });
  assert.equal(result, null);
});

/* ───────────────────────────── server wiring ───────────────────────────── */

test('server.js installs request context, a capturing handler, and process guards', () => {
  assert.match(SERVER_SRC, /app\.use\(requestContext\)/, 'request ids must be assigned');
  assert.match(SERVER_SRC, /app\.use\(async function\(err, req, res, next\)/);
  assert.match(SERVER_SRC, /captureError\(/);
  assert.match(SERVER_SRC, /process\.on\('unhandledRejection'/);
  assert.match(SERVER_SRC, /process\.on\('uncaughtException'/);
});

test('severity is derived from the status, so a 4xx is not an error', () => {
  // Logging every 401/404 as an error buries the real failures within a week.
  assert.match(SERVER_SRC, /status >= 500 \? 'error' : 'warning'/);
});

test('a 5xx response does not leak the internal message', () => {
  assert.match(SERVER_SRC, /'Something went wrong on our end\.'/);
});

test('the captured row is attributed to the account and tier', () => {
  assert.match(SERVER_SRC, /tier: req\.user\?\.tier/);
  assert.match(SERVER_SRC, /userEmail: req\.user\?\.email/);
  assert.match(SERVER_SRC, /requestId: req\.requestId/);
});

/* ───────────────────────── one logger, not two ───────────────────────── */

test('the in-memory ring buffer is gone and the old module delegates', () => {
  const loggerSrc = fs.readFileSync(path.join(ROOT, 'utils', 'logger.js'), 'utf8');
  assert.doesNotMatch(loggerSrc, /ERROR_BUFFER|MAX_BUFFER|AI_BUFFER/, 'the ring buffer must not come back');
  assert.match(loggerSrc, /require\('\.\/logging'\)/, 'it must delegate to the persisted logger');
});

test('nothing still imports the retired ring-buffer readers', () => {
  const adminSrc = fs.readFileSync(path.join(ROOT, 'routes', 'admin.js'), 'utf8');
  assert.doesNotMatch(adminSrc, /getRecentErrors|getRecentAiActions/);
  assert.match(adminSrc, /prisma\.errorLog\.findMany/, 'recent errors must come from the database');
});

/* ───────────────────────────── migration ───────────────────────────── */

test('the ErrorLog migration is additive and idempotent', () => {
  const sql = fs.readFileSync(
    path.join(ROOT, 'prisma', 'migrations', '20261001000000_error_observability', 'migration.sql'),
    'utf8',
  );

  for (const column of ['tier', 'requestId', 'fingerprint', 'status', 'path', 'userEmail', 'meta', 'stack']) {
    assert.match(sql, new RegExp(`ADD COLUMN IF NOT EXISTS "${column}"`), `${column} must be added`);
  }
  assert.doesNotMatch(sql, /DROP\s/i, 'the migration must not drop anything');
});

/* ───────────────────────────── health route ───────────────────────────── */

test('there is exactly one /health route, and it reports capture readiness', () => {
  // This is a regression guard with a real story: server.js had TWO health
  // routes. The one registered first (a multi-line handler) was the one that
  // actually matched, so a probe added to the second was unreachable — the
  // endpoint kept reporting the old shape and the check looked broken.
  const single = (SERVER_SRC.match(/app\.get\('\/health'/g) || []).length;
  const double = (SERVER_SRC.match(/app\.get\("\/health"/g) || []).length;
  assert.equal(single + double, 1, 'a duplicate health route silently shadows the real one');

  assert.match(SERVER_SRC, /errorCapture: errorCaptureProbe\.ok === true/);
  assert.match(SERVER_SRC, /verifyErrorCapture/);
});

test('the health check can never fail the service on a database hiccup', () => {
  // The probe reports readiness; it must not decide the status code.
  assert.match(SERVER_SRC, /res\.status\(200\)\.json\(\{[\s\S]{0,120}errorCapture:/);
});

/* ───────────────────────── the mounted admin router ───────────────────────── */

test('the failure list is on the router that is actually mounted', () => {
  // Second regression guard with a story: the /errors route was first added to
  // backend/routes/adminMetrics.js, which nothing imports — an orphan. The live
  // router is admin.js (mounted at /api/admin), so the endpoint 404'd in
  // production while the code looked correct in review.
  const adminSrc = fs.readFileSync(path.join(__dirname, '..', 'routes', 'admin.js'), 'utf8');
  assert.match(
    adminSrc,
    /router\.get\('\/errors',\s*requireAdmin/,
    'GET /api/admin/errors must be registered on the live admin router',
  );
  assert.ok(
    !fs.existsSync(path.join(__dirname, '..', 'routes', 'adminMetrics.js')),
    'the unmounted duplicate router must not come back',
  );
});
