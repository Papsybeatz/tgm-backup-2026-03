/**
 * The retention sweep against a REAL PostgreSQL.
 * ----------------------------------------------------------------------------
 * The other retention tests assert the SQL text and the computed cutoff, but
 * they fake Prisma — so they never prove that Postgres actually deletes the
 * rows we intend and keeps the ones we do not. That gap is exactly the kind
 * that hides a wrong comparison operator or a unit mix-up.
 *
 * This runs the real statement against a real database.
 *
 * WHY IT SKIPS BY DEFAULT
 *
 * There is no PostgreSQL in the build sandbox, and adding a WASM Postgres as a
 * dependency to a repository whose CI does not even run these tests would be a
 * large cost for one file. So this test runs when you point it at a disposable
 * database:
 *
 *     TEST_DATABASE_URL=postgresql://user:pass@host:5432/tgm_test \
 *       node --test backend/tests/score-cache-sweep-real-db.test.js
 *
 * It SKIPS LOUDLY otherwise, never silently — a skipped test that reads like a
 * pass is worse than no test at all.
 *
 * This file has been run against a real PostgreSQL engine (PGlite, Postgres
 * compiled to WASM, exposed over the wire protocol) and passes: 45-day and
 * 31-day rows are pruned, 29-day and fresh rows survive. If you use PGlite for
 * the same purpose, add `connection_limit=1` to the URL — its socket server
 * does not tolerate Prisma's connection pool opening a second connection.
 *
 * SAFETY
 *
 * It creates rows prefixed `sweeptest-` and removes exactly those on the way
 * out. It will not run at all if TEST_DATABASE_URL equals DATABASE_URL, so it
 * cannot be aimed at production by accident.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { createPrismaScoreCache, SWEEP_EVERY } = require('../utils/scoreCache');

const TEST_DB = process.env.TEST_DATABASE_URL;
const SAME_AS_PROD = Boolean(TEST_DB && process.env.DATABASE_URL && TEST_DB === process.env.DATABASE_URL);

const SKIP = SAME_AS_PROD
  ? 'refusing to run: TEST_DATABASE_URL is the same as DATABASE_URL (this would write to production)'
  : !TEST_DB
    ? 'no TEST_DATABASE_URL set — this needs a disposable PostgreSQL (see the header of this file)'
    : false;

const PREFIX = 'sweeptest-';
const DAY = 24 * 60 * 60 * 1000;

// Matches the DDL in utils/ensureSchema.js, so the test exercises the same table
// the application creates rather than a convenient lookalike.
const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS "ScoreCache" (
  "hash" TEXT NOT NULL,
  "report" JSONB NOT NULL,
  "score" INTEGER NOT NULL,
  "hits" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScoreCache_pkey" PRIMARY KEY ("hash")
)`;

const tick = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Wait for the fire-and-forget sweep to land, without racing it. */
async function waitFor(predicate, { timeoutMs = 10000, everyMs = 100 } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await predicate()) return true;
    if (Date.now() > deadline) return false;
    await tick(everyMs);
  }
}

test('the sweep prunes by age against a real PostgreSQL', { skip: SKIP }, async () => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient({ datasources: { db: { url: TEST_DB } } });

  // Pin the window so the test does not depend on the ambient environment.
  const before = process.env.SCORE_CACHE_RETENTION_DAYS;
  process.env.SCORE_CACHE_RETENTION_DAYS = '30';
  const RETENTION = 30;

  const hashes = (ageDays) => `${PREFIX}${ageDays}d`;
  const cleanup = () => prisma.$executeRawUnsafe(`DELETE FROM "ScoreCache" WHERE "hash" LIKE '${PREFIX}%'`);

  try {
    await prisma.$executeRawUnsafe(CREATE_TABLE);
    await cleanup();

    // 45d and 31d are past a 30-day window; 29d and now are inside it.
    // The 29d row is the important one: it is one day short of the boundary, so
    // an off-by-one in the comparison shows up here rather than in production.
    const now = Date.now();
    for (const ageDays of [45, 31, 29, 0]) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "ScoreCache" ("hash", "report", "score", "updatedAt")
         VALUES ($1, '{"score":1}'::jsonb, 1, $2)`,
        hashes(ageDays),
        new Date(now - ageDays * DAY),
      );
    }

    const present = async () => {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT "hash" FROM "ScoreCache" WHERE "hash" LIKE '${PREFIX}%'`,
      );
      return new Set(rows.map((r) => r.hash));
    };

    const beforeSweep = await present();
    assert.equal(beforeSweep.size, 4, 'all four fixture rows must be in place before the sweep');

    // Drive the sweep the way production does: a read operation every so often,
    // and the sweep fires on the interval.
    const cache = createPrismaScoreCache(prisma);
    for (let i = 0; i < SWEEP_EVERY; i += 1) await cache.read(`${PREFIX}missing`);

    const swept = await waitFor(async () => !(await present()).has(hashes(45)));
    assert.ok(swept, `the sweep did not run within the timeout (expected a DELETE after ${SWEEP_EVERY} operations)`);

    const after = await present();
    assert.equal(after.has(hashes(45)), false, 'a row 45 days old must be pruned');
    assert.equal(after.has(hashes(31)), false, 'a row 31 days old must be pruned');
    assert.equal(after.has(hashes(29)), true, 'a row 29 days old must survive a 30-day window');
    assert.equal(after.has(hashes(0)), true, 'a fresh row must survive');

    // And the query the admin endpoint runs must be valid Postgres. Asserted
    // here because this is the only place a real server can judge it — a fake
    // driver would accept any string at all.
    const [stats] = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS "rows", MIN("updatedAt") AS "oldestUpdatedAt" FROM "ScoreCache"
    `;
    assert.equal(typeof stats.rows, 'number', 'COUNT(*)::int must come back as a number, not a BigInt');
    assert.ok(stats.rows >= 2, 'the surviving fixture rows must be counted');
    assert.ok(stats.oldestUpdatedAt instanceof Date, 'MIN("updatedAt") must come back as a Date');

    const cutoff = new Date(Date.now() - RETENTION * DAY);
    assert.ok(
      stats.oldestUpdatedAt < cutoff === false || stats.oldestUpdatedAt >= cutoff,
      'after the sweep, nothing older than the cutoff may remain',
    );
  } finally {
    await cleanup().catch(() => {});
    await prisma.$disconnect().catch(() => {});
    if (before === undefined) delete process.env.SCORE_CACHE_RETENTION_DAYS;
    else process.env.SCORE_CACHE_RETENTION_DAYS = before;
  }
});

test('the real-DB test announces itself when it cannot run', { skip: SKIP }, () => {
  // This body only executes when a database IS configured — it exists so the
  // suite reports an explicit pass when the real-database path was exercised,
  // making it obvious in the output which mode ran.
  assert.ok(TEST_DB, 'a database must be configured for this to run');
});
