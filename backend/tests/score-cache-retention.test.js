/**
 * Retention for the score cache.
 * ----------------------------------------------------------------------------
 * The cache stores the model's report — scores plus commentary on the letter.
 * The FILE is never stored, but the report is a readable summary of what the
 * document said, so it is retained material and needs a window rather than a
 * promise.
 *
 * Two properties matter and both are easy to get wrong:
 *
 *   1. The window is bounded, and a malformed setting cannot turn it into
 *      "keep forever" or "delete everything".
 *   2. The sweep can never cost a visitor a score. It is best-effort and
 *      fire-and-forget, exactly like every other cache operation here — a
 *      database hiccup during a sweep must not become a 500 on the funnel.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createPrismaScoreCache,
  createMemoryScoreCache,
  retentionDays,
  DEFAULT_RETENTION_DAYS,
  SWEEP_EVERY,
} = require('../utils/scoreCache');

/** Records what the cache asks the database to do. */
function fakePrisma({ failExecute = false } = {}) {
  const calls = [];
  return {
    calls,
    $queryRaw: async (strings, ...values) => {
      calls.push({ kind: 'query', sql: strings.join(' ? '), values });
      return [];
    },
    $executeRaw: async (strings, ...values) => {
      calls.push({ kind: 'execute', sql: strings.join(' ? '), values });
      if (failExecute) throw new Error('db down');
      return 1;
    },
  };
}

const executeCalls = (prisma) => prisma.calls.filter((c) => c.kind === 'execute');
const sweeps = (prisma) => executeCalls(prisma).filter((c) => /DELETE FROM "ScoreCache"/.test(c.sql));
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Run `fn` with SCORE_CACHE_RETENTION_DAYS set, then restore it exactly.
 *
 * Async-aware on purpose: restoring in a `finally` around a function that was
 * merely CALLED would put the old value back at the first `await`, so an async
 * body would read the wrong window and the test would pass or fail for a reason
 * unrelated to the code. The await is load-bearing.
 */
async function withRetention(value, fn) {
  const had = Object.prototype.hasOwnProperty.call(process.env, 'SCORE_CACHE_RETENTION_DAYS');
  const before = process.env.SCORE_CACHE_RETENTION_DAYS;
  if (value === undefined) delete process.env.SCORE_CACHE_RETENTION_DAYS;
  else process.env.SCORE_CACHE_RETENTION_DAYS = value;
  try {
    return await fn();
  } finally {
    if (had) process.env.SCORE_CACHE_RETENTION_DAYS = before;
    else delete process.env.SCORE_CACHE_RETENTION_DAYS;
  }
}

test('the retention window defaults to a bounded number of days', async () => {
  await withRetention(undefined, () => {
    assert.equal(retentionDays(), DEFAULT_RETENTION_DAYS);
    assert.ok(DEFAULT_RETENTION_DAYS > 0 && DEFAULT_RETENTION_DAYS < 3650, 'must be a real window');
  });
});

test('a malformed retention setting cannot disable the window or empty the table', async () => {
  // The dangerous failure is not a crash, it is a typo that silently becomes
  // "keep forever" — or a zero that deletes every row on the next sweep.
  for (const bad of ['', '  ', 'forever', '0', '-1', 'NaN', 'Infinity', '1e999', 'null']) {
    await withRetention(bad, () => {
      assert.equal(
        retentionDays(),
        DEFAULT_RETENTION_DAYS,
        `"${bad}" must fall back to the default, not disable or zero the window`,
      );
    });
  }
});

test('a valid retention setting is honoured', async () => {
  await withRetention('7', () => assert.equal(retentionDays(), 7));
  await withRetention('90', () => assert.equal(retentionDays(), 90));
  // Whole days only — a fractional window is rounded down, never up.
  await withRetention('2.9', () => assert.equal(retentionDays(), 2));
});

test('the sweep runs on an operation count, not on every request', async () => {
  const prisma = fakePrisma();
  const cache = createPrismaScoreCache(prisma);

  // Well under the threshold: no sweep, because sweeping on every request would
  // add a DELETE to the funnel's hot path for no benefit.
  for (let i = 0; i < SWEEP_EVERY - 1; i += 1) await cache.read('hash');
  await tick();
  assert.equal(sweeps(prisma).length, 0, 'must not sweep before the threshold');

  // The threshold operation triggers exactly one.
  await cache.read('hash');
  await tick();
  assert.equal(sweeps(prisma).length, 1, 'must sweep at the threshold');

  // And the counter resets, so the next sweep is a full interval away.
  await cache.read('hash');
  await tick();
  assert.equal(sweeps(prisma).length, 1, 'the counter must reset after a sweep');
});

test('the sweep deletes by a cutoff derived from the window', async () => {
  const prisma = fakePrisma();
  const cache = createPrismaScoreCache(prisma);

  await withRetention('10', async () => {
    for (let i = 0; i < SWEEP_EVERY; i += 1) await cache.read('hash');
  });
  await tick();

  const [sweep] = sweeps(prisma);
  assert.ok(sweep, 'a sweep must have run');
  assert.match(sweep.sql, /DELETE FROM "ScoreCache" WHERE "updatedAt" < /);

  // The cutoff is a parameterised Date, not SQL interval arithmetic — that
  // keeps the statement injection-free and avoids depending on how the driver
  // types an integer inside INTERVAL.
  const [cutoff] = sweep.values;
  assert.ok(cutoff instanceof Date, 'the cutoff must be a bound Date parameter');
  const expected = Date.now() - 10 * 24 * 60 * 60 * 1000;
  assert.ok(
    Math.abs(cutoff.getTime() - expected) < 60 * 1000,
    'the cutoff must be the retention window back from now',
  );
});

test('a failing sweep cannot fail a read', async () => {
  // The whole point of best-effort. If a DELETE error surfaced here it would
  // become a 500 on the funnel and cost the visitor their score, which is a far
  // worse outcome than a table that grows for another interval.
  const prisma = fakePrisma({ failExecute: true });
  const cache = createPrismaScoreCache(prisma);

  for (let i = 0; i < SWEEP_EVERY; i += 1) {
    await assert.doesNotReject(() => cache.read('hash'), 'a failed sweep must not reject the read');
  }
  await tick();
  assert.equal(sweeps(prisma).length, 1, 'the sweep was attempted');
});

test('the sweep does not block the read that triggered it', async () => {
  // Fire-and-forget: the visitor must not wait on a DELETE that is pure
  // housekeeping.
  let deleteStarted = false;
  let releaseDelete;
  const prisma = {
    calls: [],
    $queryRaw: async () => [],
    $executeRaw: async (strings) => {
      if (/DELETE FROM "ScoreCache"/.test(strings.join(' '))) {
        deleteStarted = true;
        return new Promise((resolve) => { releaseDelete = resolve; });
      }
      return 1;
    },
  };
  const cache = createPrismaScoreCache(prisma);

  for (let i = 0; i < SWEEP_EVERY - 1; i += 1) await cache.read('hash');

  // The threshold read must resolve even though the sweep it triggers is still
  // in flight.
  await cache.read('hash');
  await tick();
  assert.equal(deleteStarted, true, 'the sweep must have started');
  releaseDelete();
  await tick();
});

test('the in-process cache needs no sweep, because it dies with the process', () => {
  // A retention window is about stored material. A Map that vanishes on
  // restart holds nothing to retain, so adding a sweep there would be work
  // with no property behind it.
  const memory = createMemoryScoreCache();
  assert.equal(memory.shared, false);
  assert.equal(typeof memory.sweep, 'undefined', 'the memory cache has nothing to sweep');
});
