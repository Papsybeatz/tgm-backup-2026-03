/**
 * The free funnel's daily walls must outlive the process that serves them.
 * ----------------------------------------------------------------------------
 * `publicRewriteDailyLimiter` (one per day) and `publicScoreDailyLimiter` (six
 * per day) were enforced from express-rate-limit's default in-process Map.
 * That made each rule a property of a process rather than of a visitor:
 *
 *   * every deploy, crash or restart handed the visitor a fresh allowance;
 *   * with more than one instance, "one per day" became "one per day per
 *     instance" — the wall widened exactly when traffic was highest.
 *
 * These tests pin the two halves of the fix: the counters are stored somewhere
 * shared, and the store keeps the semantics the limiters depend on (window
 * rollover, namespacing, decrement for `skipFailedRequests`).
 *
 * The store is exercised against an injected adapter, so this file needs no
 * database. The Postgres adapter's SQL is pinned by source, because the
 * atomicity of that one statement is the thing that makes concurrent
 * increments safe and it cannot be proven by reading a return value.
 *
 * Run: cd backend && node --test tests/rate-limit-persistence.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  createRateLimitStore,
  PersistentRateLimitStore,
  createMemoryAdapter,
} = require('../utils/rateLimitStore');

const ROOT = path.join(__dirname, '..', '..');
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');

const RATE_SRC = read('backend', 'middleware', 'rateLimit.js');
const STORE_SRC = read('backend', 'utils', 'rateLimitStore.js');
const SCHEMA_SRC = read('backend', 'utils', 'ensureSchema.js');
const PRISMA_SRC = read('backend', 'prisma', 'schema.prisma');

const DAY = 24 * 60 * 60 * 1000;

const store = (namespace, windowMs = DAY) => {
  const s = new PersistentRateLimitStore({ namespace, adapter: createMemoryAdapter() });
  s.init({ windowMs });
  return s;
};

/* ── the counters are shared, not per-process ─────────────────────────────── */

test('two instances share one counter, so the wall does not widen with scale', async () => {
  // Two stores over one adapter is two Railway instances over one database.
  // This is the exact defect: before the fix each instance had its own Map, so
  // this sequence would read 1 and 1 instead of 1 and 2.
  const adapter = createMemoryAdapter();
  const instanceA = new PersistentRateLimitStore({ namespace: 'public-rewrite-daily', adapter });
  const instanceB = new PersistentRateLimitStore({ namespace: 'public-rewrite-daily', adapter });
  instanceA.init({ windowMs: DAY });
  instanceB.init({ windowMs: DAY });

  const first = await instanceA.increment('203.0.113.7');
  const second = await instanceB.increment('203.0.113.7');

  assert.equal(first.totalHits, 1);
  assert.equal(second.totalHits, 2, 'the second instance must see the first instance hit');
});

test('a new store over the same storage keeps the count — a restart is not a reset', async () => {
  const adapter = createMemoryAdapter();
  const before = new PersistentRateLimitStore({ namespace: 'public-rewrite-daily', adapter });
  before.init({ windowMs: DAY });
  await before.increment('198.51.100.4');

  // Simulates the process being replaced by a deploy.
  const after = new PersistentRateLimitStore({ namespace: 'public-rewrite-daily', adapter });
  after.init({ windowMs: DAY });
  const hit = await after.increment('198.51.100.4');

  assert.equal(hit.totalHits, 2, 'a restart must not hand back a free rewrite');
});

/* ── window semantics ─────────────────────────────────────────────────────── */

test('the counter rolls over when its window expires', async () => {
  const s = store('public-rewrite-daily', 50);
  assert.equal((await s.increment('192.0.2.1')).totalHits, 1);
  assert.equal((await s.increment('192.0.2.1')).totalHits, 2);

  await new Promise((r) => setTimeout(r, 80));

  const afterRollover = await s.increment('192.0.2.1');
  assert.equal(afterRollover.totalHits, 1, 'an expired window must start again at one');
  assert.ok(afterRollover.resetTime.getTime() > Date.now(), 'the new window must be in the future');
});

test('a live window keeps its original expiry instead of sliding', async () => {
  const s = store('public-rewrite-daily', DAY);
  const first = await s.increment('192.0.2.2');
  await new Promise((r) => setTimeout(r, 15));
  const second = await s.increment('192.0.2.2');

  assert.equal(
    second.resetTime.getTime(),
    first.resetTime.getTime(),
    'a sliding window would let a visitor push the reset forward forever',
  );
});

test('get reports the current window and hides an expired one', async () => {
  const s = store('public-score-daily', 50);
  assert.equal(await s.get('192.0.2.3'), undefined, 'an unseen key has no window');

  await s.increment('192.0.2.3');
  const live = await s.get('192.0.2.3');
  assert.equal(live.totalHits, 1);

  await new Promise((r) => setTimeout(r, 80));
  assert.equal(await s.get('192.0.2.3'), undefined, 'an expired window is indistinguishable from none');
});

/* ── the limiters depend on these ─────────────────────────────────────────── */

test('decrement gives back a hit, which is what skipFailedRequests relies on', async () => {
  const s = store('public-rewrite-daily');
  await s.increment('192.0.2.4');
  await s.increment('192.0.2.4');
  await s.decrement('192.0.2.4');

  assert.equal((await s.get('192.0.2.4')).totalHits, 1, 'a rejected upload must not burn the rewrite');
});

test('decrement never drives a counter below zero', async () => {
  const s = store('public-rewrite-daily');
  await s.decrement('192.0.2.5');
  const hit = await s.increment('192.0.2.5');
  assert.equal(hit.totalHits, 1, 'a negative count would buy the visitor extra hits');
});

test('each limiter gets its own counter, so one wall cannot spend the other allowance', async () => {
  // Every limiter is handed the same key (the client IP). Without namespacing,
  // the rewrite would silently consume one of the six daily scores.
  const adapter = createMemoryAdapter();
  const rewrite = new PersistentRateLimitStore({ namespace: 'public-rewrite-daily', adapter });
  const score = new PersistentRateLimitStore({ namespace: 'public-score-daily', adapter });
  rewrite.init({ windowMs: DAY });
  score.init({ windowMs: DAY });

  await rewrite.increment('203.0.113.9');
  const scoreHit = await score.increment('203.0.113.9');

  assert.equal(scoreHit.totalHits, 1, 'the score counter must not inherit the rewrite hit');
});

test('resetKey clears one visitor and resetAll clears only this limiter', async () => {
  const adapter = createMemoryAdapter();
  const rewrite = new PersistentRateLimitStore({ namespace: 'public-rewrite-daily', adapter });
  const score = new PersistentRateLimitStore({ namespace: 'public-score-daily', adapter });
  rewrite.init({ windowMs: DAY });
  score.init({ windowMs: DAY });

  await rewrite.increment('a');
  await rewrite.increment('b');
  await score.increment('a');

  await rewrite.resetKey('a');
  assert.equal(await rewrite.get('a'), undefined, 'resetKey must clear the named visitor');
  assert.equal((await rewrite.get('b')).totalHits, 1, 'resetKey must not touch anyone else');

  await rewrite.resetAll();
  assert.equal(await rewrite.get('b'), undefined, 'resetAll must clear this limiter');
  assert.equal((await score.get('a')).totalHits, 1, 'resetAll must not clear another limiter');
});

/* ── the express-rate-limit contract ──────────────────────────────────────── */

test('the store satisfies the express-rate-limit Store interface', () => {
  const s = store('public-rewrite-daily');
  for (const method of ['init', 'get', 'increment', 'decrement', 'resetKey', 'resetAll', 'shutdown']) {
    assert.equal(typeof s[method], 'function', `${method} must exist on the store`);
  }
  assert.equal(
    s.localKeys,
    false,
    'keys here are shared between instances — reporting true would be a lie the library trusts',
  );
  assert.ok(s.prefix, 'the library reads store.prefix to tell two stores apart');
});

test('init adopts the limiter window, so the store and the limiter cannot disagree', () => {
  const s = new PersistentRateLimitStore({ namespace: 'x', adapter: createMemoryAdapter() });
  s.init({ windowMs: 1234 });
  assert.equal(s.windowMs, 1234);
});

test('the limiters actually enforce through the store', async () => {
  // End to end through express-rate-limit itself: the real proof that the
  // custom store is wired correctly, not merely present.
  const express = require('express');
  const rateLimit = require('express-rate-limit');
  const http = require('node:http');

  const adapter = createMemoryAdapter();
  const s = new PersistentRateLimitStore({ namespace: 'integration-rewrite', adapter });
  const limiter = rateLimit({
    windowMs: DAY,
    max: 1,
    store: s,
    passOnStoreError: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'wall',
  });

  const app = express();
  app.get('/probe', limiter, (_req, res) => res.status(200).json({ ok: true }));
  const server = app.listen(0);
  const { port } = server.address();

  const get = () => new Promise((resolve, reject) => {
    http.get({ hostname: '127.0.0.1', port, path: '/probe' }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    }).on('error', reject);
  });

  try {
    assert.equal(await get(), 200, 'the first free rewrite is allowed');
    assert.equal(await get(), 429, 'the second is refused by the shared counter');
  } finally {
    server.close();
  }
});

/* ── the Postgres adapter's atomicity ─────────────────────────────────────── */

test('the Postgres increment is one atomic upsert, not a read then a write', () => {
  // A read-then-write loses an increment when two instances race, which lets a
  // visitor through the wall precisely under load. Only the database can
  // serialise this, so the increment must be a single statement.
  assert.match(STORE_SRC, /ON CONFLICT \("id"\) DO UPDATE/, 'the increment must upsert');
  assert.match(STORE_SRC, /RETURNING "count", "resetAt"/, 'the post-update truth must come back');
  assert.match(
    STORE_SRC,
    /WHEN "RateLimitCounter"\."resetAt" <= NOW\(\) THEN 1/,
    'window rollover must be decided inside the statement',
  );
  assert.doesNotMatch(
    STORE_SRC,
    /SELECT[\s\S]{0,400}?then[\s\S]{0,200}?UPDATE/i,
    'a select followed by an update would be the race this design exists to avoid',
  );
});

test('the sweep that stops the table growing is best-effort and cannot fail a request', () => {
  assert.match(STORE_SRC, /DELETE FROM "\$\{TABLE\}"|DELETE FROM "RateLimitCounter"/);
  assert.match(STORE_SRC, /catch \{ \/\* housekeeping is not load-bearing \*\/ \}/);
});

test('a database blip lets visitors through rather than refusing the whole site', () => {
  // Failing closed would turn a database hiccup into an outage. This is a
  // monetisation wall, so the deliberate choice is to fail open — and loudly.
  assert.match(STORE_SRC, /Failing open, on purpose/, 'the choice must be documented, not incidental');
  const block = RATE_SRC.match(/publicRewriteDailyLimiter\s*=\s*rateLimit\(\{[\s\S]*?\}\);/);
  assert.ok(block, 'publicRewriteDailyLimiter definition not found');
  assert.match(block[0], /passOnStoreError:\s*true/);

  const daily = RATE_SRC.match(/publicScoreDailyLimiter\s*=\s*rateLimit\(\{[\s\S]*?\}\);/);
  assert.ok(daily, 'publicScoreDailyLimiter definition not found');
  assert.match(daily[0], /passOnStoreError:\s*true/);
});

/* ── the wiring, and the fallback ─────────────────────────────────────────── */

test('both daily limiters use the persistent store instead of the default Map', () => {
  const rewrite = RATE_SRC.match(/publicRewriteDailyLimiter\s*=\s*rateLimit\(\{[\s\S]*?\}\);/);
  assert.ok(rewrite, 'publicRewriteDailyLimiter definition not found');
  assert.match(rewrite[0], /store:\s*publicRewriteDailyStore/, 'the rewrite wall must not be in-process');
  assert.doesNotMatch(rewrite[0], /MemoryStore/, 'MemoryStore is the bug this replaced');

  const daily = RATE_SRC.match(/publicScoreDailyLimiter\s*=\s*rateLimit\(\{[\s\S]*?\}\);/);
  assert.ok(daily, 'publicScoreDailyLimiter definition not found');
  assert.match(daily[0], /store:\s*publicScoreDailyStore/, 'the daily score cap must not be in-process');
  assert.doesNotMatch(daily[0], /MemoryStore/);

  // The limits themselves are unchanged — this is a storage fix, not a
  // policy change.
  assert.equal(Number(rewrite[0].match(/max:\s*(\d+)/)?.[1]), 1);
  assert.equal(Number(daily[0].match(/max:\s*(\d+)/)?.[1]), 6);
  assert.match(rewrite[0], /skipFailedRequests:\s*true/);
  assert.match(daily[0], /skipFailedRequests:\s*true/);
});

test('without a database the store degrades to memory, and says so out loud', async () => {
  const saved = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    const s = createRateLimitStore('fallback-probe');
    s.init({ windowMs: DAY });
    const hit = await s.increment('198.51.100.9');
    assert.equal(hit.totalHits, 1, 'a local run must still count, just not durably');

    assert.match(STORE_SRC, /warnOnce\(/, 'a silent fallback is how this bug comes back');
    assert.match(STORE_SRC, /is using the in-process store/);
  } finally {
    if (saved !== undefined) process.env.DATABASE_URL = saved;
  }
});

test('the counter table is created at boot, since migrate deploy cannot run here', () => {
  assert.match(SCHEMA_SRC, /CREATE TABLE IF NOT EXISTS "RateLimitCounter"/);
  assert.match(SCHEMA_SRC, /RateLimitCounter resetAt index/);
  assert.match(PRISMA_SRC, /model RateLimitCounter \{/);
});
