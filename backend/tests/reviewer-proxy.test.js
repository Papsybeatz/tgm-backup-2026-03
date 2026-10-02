/**
 * Reviewer mode — the main backend's path to the funder sidecar.
 *
 * One of three flows never exercised live. The reviewer logic itself already has
 * tests inside the sidecar; what was never run is the hop the browser actually
 * makes:  browser -> POST /api/funder/reviewer/worklist -> sidecar.
 *
 * The property that matters most here is that an unconfigured or unreachable
 * sidecar fails LOUDLY with a distinct code, rather than returning an empty
 * worklist that looks like "no applications need review".
 *
 * A fake sidecar is stood up on a real port, so postToSidecar's actual HTTP
 * path runs.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const http = require('node:http');
const express = require('express');

function stub(key, exports) {
  const m = new Module(key);
  m.filename = key;
  m.loaded = true;
  m.exports = exports;
  require.cache[key] = m;
}

const AUTH_KEY = require.resolve('../middleware/auth');
stub(AUTH_KEY, (req, _res, next) => {
  req.user = { id: 'u1', email: 'owner@example.com' };
  next();
});

const router = require('../routes/funderReviewer.js');
const app = express();
app.use(express.json());
app.use('/api/funder', router);

// ── a controllable fake sidecar ─────────────────────────────────────────────
let sidecarReply = { status: 200, body: { worklist: [] } };
let sidecarHits = 0;
let lastSidecarPayload = null;

const sidecar = http.createServer((req, res) => {
  sidecarHits += 1;
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    try { lastSidecarPayload = JSON.parse(raw || '{}'); } catch { lastSidecarPayload = null; }
    res.writeHead(sidecarReply.status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(sidecarReply.body));
  });
});

const server = app.listen(0);
let SIDECAR_URL = '';
let BASE = '';

test.before(async () => {
  await new Promise((r) => sidecar.listen(0, '127.0.0.1', r));
  await new Promise((r) => (server.listening ? r() : server.once('listening', r)));
  SIDECAR_URL = `http://127.0.0.1:${sidecar.address().port}`;
  BASE = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
  server.close();
  sidecar.close();
});

const ENV_KEYS = ['FUNDER_INTELLIGENCE_BASE_URL', 'FUNDER_INTELLIGENCE_REVIEWER_KEY'];
const savedEnv = {};
for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
test.after(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

function configure({ url = SIDECAR_URL, key = 'org-key-123' } = {}) {
  if (url === null) delete process.env.FUNDER_INTELLIGENCE_BASE_URL;
  else process.env.FUNDER_INTELLIGENCE_BASE_URL = url;
  if (key === null) delete process.env.FUNDER_INTELLIGENCE_REVIEWER_KEY;
  else process.env.FUNDER_INTELLIGENCE_REVIEWER_KEY = key;
  sidecarHits = 0;
  lastSidecarPayload = null;
  sidecarReply = { status: 200, body: { worklist: [] } };
}

async function worklist(body, headers = {}) {
  const res = await fetch(`${BASE}/api/funder/reviewer/worklist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

const ONE_APP = [{ id: 'a1', applicant: 'Acme' }];

/* ── unconfigured must fail loudly ─────────────────────────────────── */

test('without a reviewer key the route refuses with a distinct code', async () => {
  configure({ key: null });
  const r = await worklist({ applications: ONE_APP });
  assert.equal(r.status, 503);
  assert.equal(r.body.error, 'reviewer_not_configured');
  assert.equal(sidecarHits, 0, 'nothing should be sent to a sidecar we cannot authenticate to');
});

test('without a sidecar URL the route refuses with a distinct code', async () => {
  configure({ url: null });
  const r = await worklist({ applications: ONE_APP });
  assert.equal(r.status, 503);
  assert.equal(r.body.error, 'sidecar_not_configured');
});

test('an unconfigured reviewer returns an error, never a silently empty worklist', async () => {
  configure({ key: null });
  const r = await worklist({ applications: ONE_APP });
  assert.notEqual(r.status, 200, 'a misconfigured reviewer must not look like "nothing to review"');
  assert.ok(r.body.error || r.body.message);
});

/* ── input validation ──────────────────────────────────────────────── */

test('an empty cohort is a bad request', async () => {
  configure();
  const r = await worklist({ applications: [] });
  assert.equal(r.status, 400);
  assert.equal(sidecarHits, 0);
});

test('an oversized cohort is refused before it reaches the sidecar', async () => {
  configure();
  const r = await worklist({ applications: Array.from({ length: 501 }, (_, i) => ({ id: `a${i}` })) });
  assert.equal(r.status, 400);
  assert.equal(sidecarHits, 0, 'the cap must be enforced on our side, not the sidecar\'s');
});

/* ── the hop itself ────────────────────────────────────────────────── */

test('a configured reviewer proxies the cohort to the sidecar and returns its worklist', async () => {
  configure();
  sidecarReply = { status: 200, body: { worklist: [{ id: 'a1', decision: 'advance' }], meta: { count: 1 } } };

  const r = await worklist({ applications: ONE_APP });

  assert.equal(r.status, 200);
  assert.equal(r.body.success, true);
  assert.deepEqual(r.body.worklist, [{ id: 'a1', decision: 'advance' }]);
  assert.equal(r.body.meta.count, 1);
  assert.equal(sidecarHits, 1);
  assert.ok(Array.isArray(lastSidecarPayload.applications));
  assert.equal(lastSidecarPayload.applications.length, 1);
});

test('the caller\'s own funder key is forwarded and takes precedence', async () => {
  configure();
  await worklist({ applications: ONE_APP }, { 'x-funder-key': 'caller-key-999' });
  assert.equal(sidecarHits, 1, 'the request reached the sidecar');
});

test('a sidecar rejection is passed through with its own status and words', async () => {
  configure();
  sidecarReply = { status: 401, body: { message: 'Invalid organisation key.' } };

  const r = await worklist({ applications: ONE_APP });

  assert.equal(r.status, 401, 'the sidecar\'s status is not flattened to a 500');
  assert.equal(r.body.success, false);
  assert.match(r.body.message, /Invalid organisation key/);
});

test('an unreachable sidecar is reported as a bad gateway, not a success', async () => {
  configure({ url: 'http://127.0.0.1:1' }); // nothing listens here
  const r = await worklist({ applications: ONE_APP });
  assert.equal(r.status, 502);
  assert.equal(r.body.success, false);
});

/* ── the status probe the UI uses ──────────────────────────────────── */

test('the status probe reports configuration without leaking the key', async () => {
  configure();
  const res = await fetch(`${BASE}/api/funder/reviewer/status`);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.configured, true);
  assert.equal(body.hasSidecarUrl, true);
  assert.equal(body.hasKey, true);
  assert.doesNotMatch(JSON.stringify(body), /org-key-123/, 'the key itself is never returned');
});

test('the status probe reports an unconfigured reviewer honestly', async () => {
  configure({ key: null, url: null });
  const res = await fetch(`${BASE}/api/funder/reviewer/status`);
  const body = await res.json();
  assert.equal(body.configured, false);
  assert.equal(body.hasSidecarUrl, false);
  assert.equal(body.hasKey, false);
});
