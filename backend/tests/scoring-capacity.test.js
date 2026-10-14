/**
 * The free funnel's behaviour when the model provider is at capacity.
 * ----------------------------------------------------------------------------
 * The ceiling is Groq's 8,000 tokens per minute, which works out at roughly two
 * to four NEW letters per minute for the whole site. The score cache hides this
 * while testing with one document and stops hiding it the moment real traffic
 * arrives with new ones. See utils/scoringCapacity.js for why the answer is a
 * fast, honest shed rather than a queue.
 *
 * What these tests protect:
 *
 *   - the shed actually sheds, and never leaks a slot;
 *   - a capacity failure is told apart from a genuine fault;
 *   - a shed refunds the visitor's day, because no attempt was made;
 *   - the route and the page wire those together, so a busy scorer is never
 *     rendered as a crash and never silently costs one of the six scores.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  ScorerBusyError,
  isScorerBusyError,
  classifyProviderError,
  withScoringSlot,
  retryAfterSecondsFromMessage,
  __setMaxConcurrent,
  __inFlight,
} = require('../utils/scoringCapacity');

const read = (...parts) => fs.readFileSync(path.join(__dirname, '..', ...parts), 'utf8');
const RATE_SRC = read('middleware', 'rateLimit.js');
const ROUTE_SRC = read('routes', 'publicScore.js');
const PAGE_SRC = fs.readFileSync(
  path.join(__dirname, '..', '..', 'src', 'components', 'PublicScorePage.jsx'),
  'utf8',
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Always restore the default, or one test silently changes the next one. */
const withCapacity = async (max, fn) => {
  __setMaxConcurrent(max);
  try {
    return await fn();
  } finally {
    __setMaxConcurrent(2);
  }
};

test('a call under capacity runs and returns its value', async () => {
  await withCapacity(2, async () => {
    assert.equal(await withScoringSlot(async () => 'scored'), 'scored');
    assert.equal(__inFlight(), 0, 'the slot must be released');
  });
});

test('a call over capacity is refused immediately, not queued', async () => {
  await withCapacity(1, async () => {
    let release;
    const held = withScoringSlot(() => new Promise((resolve) => { release = resolve; }));

    // The second call must not wait for the first. Waiting is how a fast
    // refusal becomes a slow one, which is the exact failure being fixed.
    const started = Date.now();
    await assert.rejects(
      () => withScoringSlot(async () => 'second'),
      (error) => {
        assert.ok(isScorerBusyError(error), 'must be a ScorerBusyError');
        assert.equal(error.code, 'SCORER_BUSY');
        assert.equal(typeof error.retryAfterSeconds, 'number');
        return true;
      },
    );
    assert.ok(Date.now() - started < 250, 'the refusal must be immediate, not a wait');

    release();
    await held;
    assert.equal(__inFlight(), 0);
  });
});

test('a slot is released even when the work throws', async () => {
  // A leaked slot permanently shrinks capacity, and the symptom would be a
  // site that gets slower the longer it runs — the worst kind of bug to find
  // in production.
  await withCapacity(1, async () => {
    await assert.rejects(() => withScoringSlot(async () => { throw new Error('boom'); }));
    assert.equal(__inFlight(), 0, 'a throwing call must not leak its slot');

    // Proof the capacity is really back, not just that the counter reads zero.
    assert.equal(await withScoringSlot(async () => 'after failure'), 'after failure');
  });
});

test('concurrent calls up to the limit all succeed', async () => {
  await withCapacity(3, async () => {
    const results = await Promise.all([
      withScoringSlot(async () => { await sleep(5); return 1; }),
      withScoringSlot(async () => { await sleep(5); return 2; }),
      withScoringSlot(async () => { await sleep(5); return 3; }),
    ]);
    assert.deepEqual(results, [1, 2, 3]);
    assert.equal(__inFlight(), 0);
  });
});

test("Groq's rate-limit error is classified as capacity, not breakage", () => {
  // The real shape, as llm.js assembles it from every attempt.
  const message =
    'openai/gpt-oss-120b: 429 Rate limit reached for gpt-oss-120b in organization org_x ' +
    'on requests per min (RPM): Limit 30, Used 30. Please try again in 2.5s.';
  const verdict = classifyProviderError(new Error(message));
  assert.equal(verdict.busy, true, 'a rate limit is recoverable capacity, not a fault');
  assert.ok(verdict.retryAfterSeconds >= 1);
});

test('a model problem is NOT classified as capacity', () => {
  // Otherwise a decommissioned model would be reported to the visitor as "we
  // are busy, try again", and they would retry forever.
  for (const message of [
    'openai/gpt-oss-120b: model_not_found',
    'invalid api key',
    'rewrite came back empty',
    'socket hang up',
  ]) {
    assert.equal(classifyProviderError(new Error(message)).busy, false, message);
  }
});

test('the retry hint is rounded up, padded, and capped at a minute', () => {
  // Groq's window is a minute boundary, not a countdown, so the raw number is
  // a lower bound. Padding stops us telling the visitor to retry into the same
  // closed window.
  assert.equal(retryAfterSecondsFromMessage('Please try again in 2.5s.'), 5);
  assert.equal(retryAfterSecondsFromMessage('Please try again in 0.4s.'), 3);
  assert.equal(retryAfterSecondsFromMessage('Please try again in 900s.'), 60);
  assert.equal(retryAfterSecondsFromMessage('something else'), null);
  assert.equal(retryAfterSecondsFromMessage(''), null);
});

test('a busy provider produces a 503 with a code the page can branch on', () => {
  // The page needs to tell "we are busy" from "we are broken". A bare 500 gave
  // it nothing to work with, so a capacity shed rendered as a crash.
  assert.match(ROUTE_SRC, /error: 'scorer_busy'/);
  assert.match(ROUTE_SRC, /res\.status\(503\)\.json\(\{/);
  assert.match(ROUTE_SRC, /res\.set\('Retry-After', String\(retryAfterSeconds\)\)/);
  // And the code is checked BEFORE the generic failure branch in the page, or
  // the specific case is dead code.
  const generic = PAGE_SRC.indexOf("if (!res.ok || !data.success)");
  const busy = PAGE_SRC.indexOf("data.error === 'scorer_busy'");
  assert.ok(busy > -1, 'the page must branch on the busy code');
  assert.ok(busy < generic, 'the busy branch must come before the generic failure branch');
});

test('the capacity shed marks the response so the day is refunded', () => {
  // Two halves that are only useful together: the route marks the response,
  // and the limiter predicate reads the mark. Either one alone means a busy
  // afternoon quietly eats a visitor's six free scores.
  assert.match(
    ROUTE_SRC,
    /function rejectBusy\(res[\s\S]*?res\.locals\.scorerBusy = true/,
    'the route must mark the response as a capacity shed',
  );
  assert.match(
    RATE_SRC,
    /function responseRefundsTheDay\(res\)\s*\{[\s\S]*?scorerBusy/,
    'the refund predicate must read the mark',
  );
});

test('only the model call is gated, so a cache hit is never refused', () => {
  // A cache hit costs no tokens and cannot overload anything. Gating the whole
  // handler would let a busy moment refuse a visitor whose answer was already
  // sitting in the database — the cheapest possible request, refused for
  // capacity reasons.
  assert.match(
    ROUTE_SRC,
    /compute:\s*\(\)\s*=>\s*withScoringSlot\(\(\)\s*=>\s*scoreDraft\(/,
    'the gate belongs on the model call inside compute, not around scoreLetter',
  );
  // Searched AFTER the cache wiring, because the module import at the top of
  // the file also contains the name and would satisfy the check on its own.
  const cacheRead = ROUTE_SRC.indexOf('cache: scoreCache');
  const gateInsideCache = ROUTE_SRC.indexOf('withScoringSlot', cacheRead);
  assert.ok(cacheRead > -1, 'the cache wiring must be present');
  assert.ok(
    gateInsideCache > cacheRead,
    'the cache must be read before any slot is taken',
  );
});

test('the rewrite is gated on the same ceiling as scoring', () => {
  // Both reach the same provider, so a scoring burst must be able to shed a
  // rewrite too — otherwise the rewrite path is an unguarded door onto a
  // ceiling that is already full.
  assert.match(
    ROUTE_SRC,
    /withScoringSlot\(\(\)\s*=>\s*\n?\s*rewriteText\(/,
    'the rewrite call must be gated too',
  );
});

test('a genuine fault still reports as a fault', () => {
  // The whole point of the classification is that it is narrow. A provider
  // outage must keep the existing 500 — reporting it as "busy, try again"
  // would have the visitor retrying a service that is actually down.
  assert.match(ROUTE_SRC, /faultMessage: 'Scoring failed\. Please try again\.'/);
  assert.match(ROUTE_SRC, /faultMessage: 'Rewrite failed\. Please try again\.'/);
  assert.match(
    ROUTE_SRC,
    /const \{ busy, retryAfterSeconds \} = classifyProviderError\(error\);\s*if \(busy\)/,
  );
});
