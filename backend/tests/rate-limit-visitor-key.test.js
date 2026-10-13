/**
 * The daily wall is a promise about a PERSON, not about a proxy.
 * ----------------------------------------------------------------------------
 * express-rate-limit's default key is `req.ip`. Behind the Vercel -> Railway
 * chain that was the LAST entry of `X-Forwarded-For` — the edge address the
 * proxy appends — not the visitor in the first entry. A production log read on
 * 2026-10-12 showed ten requests collapsing onto three keys
 * (84.17.44.226/.227/.229, Datacamp Limited, Los Angeles, matching
 * `x-railway-edge: lax1`) while the client sat in the first entry.
 *
 * The failure that mattered was not a leak but a wall that refused strangers: a
 * visitor's own six-a-day was shared with everyone else routed through the same
 * edge, so a first-time visitor could be told they had already used their free
 * score. The proof was the counter itself — two identical requests, identical
 * headers, seconds apart, returned different resets (12209, then 76314). One
 * client cannot be on two counters unless the key is not the client.
 *
 * So every test here sends the production header SHAPE, not a convenient one:
 *
 *     X-Forwarded-For: <visitor>, <edge>
 *
 * Two visitors behind the same edge. The control uses the default key and shows
 * they collide; the real limiter uses `visitorKey` and shows they do not. A
 * test that only sent a bare visitor address would pass either way and prove
 * nothing — the whole bug lives in the second entry.
 *
 * Run: cd backend && node --test tests/rate-limit-visitor-key.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const rateLimit = require('express-rate-limit');

const {
  publicScoreDailyLimiter,
  publicRewriteDailyLimiter,
  publicScoreLimiter,
  visitorKey,
} = require('../middleware/rateLimit');

const ROOT = path.join(__dirname, '..', '..');
const RATE_SRC = fs.readFileSync(
  path.join(ROOT, 'backend', 'middleware', 'rateLimit.js'),
  'utf8'
);

// The edge both visitors share — the exact address from the production log.
const EDGE = '84.17.44.226';
const VISITOR_A = '198.51.100.10';
const VISITOR_B = '198.51.100.20';

const forwarded = (visitor) => ({ 'x-forwarded-for': `${visitor}, ${EDGE}` });

/** Boot an app on a real socket so `req.ip` and headers behave as in production. */
async function withServer(limiter, handler, run) {
  const app = express();
  // Mirrors server.js. Without it `req.ip` is the socket and the control below
  // would not reproduce the bug at all.
  app.set('trust proxy', 1);
  app.use('/api/public', limiter, handler || ((req, res) => res.json({ ok: true })));

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;

  try {
    return await run(async (headers) => {
      const res = await fetch(`http://127.0.0.1:${port}/api/public/score`, {
        method: 'POST',
        headers,
      });
      return res.status;
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

// ---------------------------------------------------------------------------
// The key itself
// ---------------------------------------------------------------------------

test('the key is the visitor in the first X-Forwarded-For entry, not the edge', () => {
  assert.equal(visitorKey({ headers: forwarded(VISITOR_A) }), VISITOR_A);
  assert.equal(visitorKey({ headers: forwarded(VISITOR_B) }), VISITOR_B);
});

test('the key ignores anything appended after the first entry', () => {
  // A client can send extra hops; the platform's entry is the first one.
  const req = {
    headers: { 'x-forwarded-for': `${VISITOR_A}, ${EDGE}, 203.0.113.99` },
  };
  assert.equal(visitorKey(req), VISITOR_A);
});

test('the key falls back to x-real-ip, then req.ip', () => {
  assert.equal(
    visitorKey({ headers: { 'x-real-ip': VISITOR_A }, ip: '10.0.0.1' }),
    VISITOR_A
  );
  assert.equal(visitorKey({ headers: {}, ip: '10.0.0.2' }), '10.0.0.2');
});

test('the key survives a missing header without throwing', () => {
  assert.equal(visitorKey({ headers: {} }), '');
  assert.equal(visitorKey({ headers: { 'x-forwarded-for': '  ' }, ip: '' }), '');
});

test('the key normalises IPv6 to the delegated /56, so one visitor cannot rotate addresses', () => {
  const a = visitorKey({ headers: { 'x-forwarded-for': '2001:db8:1:2:3:4:5:6' } });
  const b = visitorKey({ headers: { 'x-forwarded-for': '2001:db8:1:2:ffff::9' } });

  assert.equal(a, '2001:db8:1::/56');
  // Same /56 => same key. This is the difference between a limit and a bypass.
  assert.equal(a, b);
});

test('the key keeps IPv4 exact', () => {
  assert.equal(visitorKey({ headers: forwarded(VISITOR_A) }), VISITOR_A);
  assert.notEqual(
    visitorKey({ headers: forwarded(VISITOR_A) }),
    visitorKey({ headers: forwarded(VISITOR_B) })
  );
});

// ---------------------------------------------------------------------------
// The wiring — all three funnel limiters, not just the daily ones
// ---------------------------------------------------------------------------

test('every public funnel limiter uses the visitor key', () => {
  for (const name of [
    'publicScoreLimiter',
    'publicScoreDailyLimiter',
    'publicRewriteDailyLimiter',
  ]) {
    const block = RATE_SRC.match(
      new RegExp(`const ${name} = rateLimit\\(\\{[\\s\\S]*?\\n\\}\\);`)
    );
    assert.ok(block, `${name} definition not found`);
    assert.match(
      block[0],
      /keyGenerator:\s*visitorKey/,
      `${name} must key on the visitor, not on the proxy`
    );
  }
});

// ---------------------------------------------------------------------------
// The behaviour — the actual promise
// ---------------------------------------------------------------------------

test('the control: with the default key, two visitors behind one edge share a counter', async () => {
  // Proves the tests below can fail. Same options, default keyGenerator.
  const defaultKeyLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 6,
    validate: false,
    standardHeaders: true,
    legacyHeaders: false,
  });

  await withServer(defaultKeyLimiter, null, async (send) => {
    for (let i = 0; i < 6; i += 1) {
      assert.equal(await send(forwarded(VISITOR_A)), 200, `A request ${i + 1}`);
    }
    // B has never made a request, yet is refused — because the key is the edge.
    assert.equal(
      await send(forwarded(VISITOR_B)),
      429,
      'the default key is expected to collide the two visitors'
    );
  });
});

test('the daily score cap gives two visitors behind one edge separate counters', async () => {
  await withServer(publicScoreDailyLimiter, null, async (send) => {
    for (let i = 0; i < 6; i += 1) {
      assert.equal(
        await send(forwarded(VISITOR_A)),
        200,
        `A should get their ${i + 1}th score`
      );
    }

    // The fix: B's FIRST request must not be refused because A used theirs.
    assert.equal(
      await send(forwarded(VISITOR_B)),
      200,
      'a first-time visitor must not inherit a stranger’s spent allowance'
    );

    // And A's own cap still bites, so the fix did not simply remove the wall.
    assert.equal(await send(forwarded(VISITOR_A)), 429, 'A’s 7th must be refused');
  });
});

test('the rewrite wall gives each visitor their own single free rewrite', async () => {
  await withServer(publicRewriteDailyLimiter, null, async (send) => {
    assert.equal(await send(forwarded(VISITOR_A)), 200, 'A gets one rewrite');
    assert.equal(
      await send(forwarded(VISITOR_B)),
      200,
      'B must not be blocked by A’s rewrite'
    );
    assert.equal(await send(forwarded(VISITOR_A)), 429, 'A’s second is refused');
  });
});

test('the burst limiter is per visitor too, so a busy edge does not throttle a newcomer', async () => {
  await withServer(publicScoreLimiter, null, async (send) => {
    for (let i = 0; i < 5; i += 1) {
      assert.equal(await send(forwarded(VISITOR_A)), 200, `A burst ${i + 1}`);
    }
    assert.equal(await send(forwarded(VISITOR_A)), 429, 'A’s 6th in a minute');
    assert.equal(
      await send(forwarded(VISITOR_B)),
      200,
      'B’s first request must survive A’s burst'
    );
  });
});
