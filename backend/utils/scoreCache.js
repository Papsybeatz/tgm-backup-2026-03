'use strict';

/**
 * A stable score for a stable letter.
 *
 * The scoring model is stochastic. `scoring.js` already pins `temperature: 0`
 * with the comment "scoring must be reproducible, not a lottery", and the prompt
 * is built from a fixed rubric with no dates or randomness in it — and the same
 * letter still came back 62/51/58/51. Temperature 0 is a request, not a
 * guarantee: the provider batches requests and routes tokens through a
 * mixture-of-experts, so identical input can take a different path.
 *
 * No prompt or parameter change can force that to be reproducible. What we can
 * do is stop asking twice. Hashing the letter and remembering the report makes
 * the score deterministic on the one surface where a visitor can watch it
 * change — and, as a side effect, stops us paying the model to score the same
 * document over and over.
 *
 * Scope note: this keys on the document alone, so it is correct for any caller
 * whose score depends only on the document (the anonymous funnel, which passes
 * no order and no client context). A caller whose score also depends on context
 * must fold that context into the hash before using this module.
 */

const crypto = require('node:crypto');

const TABLE = 'ScoreCache';

/**
 * How long a derived report is kept.
 *
 * The row holds the model's commentary on someone's letter. The FILE is gone,
 * but a readable summary of what it said is not — so this is retained material
 * and needs a window rather than a promise.
 *
 * Keeping it forever has no matching benefit: the cache exists to make a repeat
 * score consistent and to save tokens, and both matter over a short horizon.
 * Thirty days is generous for that while bounding how long a consultant's
 * client material sits in our database. Override with
 * SCORE_CACHE_RETENTION_DAYS.
 *
 * The cost of having a window at all: a letter re-scored after it lapses can
 * come back with a different number, because the model is stochastic. That is
 * the honest trade — the alternative is holding the report indefinitely, and
 * the page promises the material does not stick around.
 */
const DEFAULT_RETENTION_DAYS = 30;

/**
 * Operations between sweeps.
 *
 * Counted rather than timed, and counted on operations that already touch the
 * database, so the sweep cannot keep a serverless instance alive or add a
 * timer to a request path.
 */
const SWEEP_EVERY = 500;

/**
 * The retention window in days, validated.
 *
 * A malformed value must not silently become "keep forever" or "delete
 * everything", so anything that is not a positive whole number falls back to
 * the default.
 */
function retentionDays() {
  const raw = process.env.SCORE_CACHE_RETENTION_DAYS;
  if (raw === undefined || raw === '') return DEFAULT_RETENTION_DAYS;
  const days = Number(raw);
  if (!Number.isFinite(days) || days < 1) return DEFAULT_RETENTION_DAYS;
  return Math.floor(days);
}

/**
 * Collapse a letter to the form we hash.
 *
 * Deliberately narrow. Uploaded .docx, exported PDF and pasted text all differ
 * in whitespace and in whatever tags survive extraction, but they carry the same
 * words. Case is NOT folded: two letters differing only in case are different
 * letters, and treating them as one would hand a visitor someone else's score.
 */
function normalizeLetter(text) {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Stable key for a letter. Returns null when there is nothing to key on. */
function hashLetter(text) {
  const normalized = normalizeLetter(text);
  if (!normalized) return null;
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/** In-process fallback. Correct within one process; not shared between them. */
function createMemoryScoreCache() {
  const rows = new Map();

  return {
    shared: false,
    async read(hash) {
      return rows.get(hash) || null;
    },
    async remember(hash, report, score) {
      // First writer wins, so a concurrent pair still agree on one number.
      if (!rows.has(hash)) rows.set(hash, { report, score });
      return rows.get(hash);
    },
    async recordHit(hash) {
      const row = rows.get(hash);
      if (row) row.hits = (row.hits || 0) + 1;
    },
  };
}

function createPrismaScoreCache(prisma) {
  const decode = (row) => {
    if (!row) return null;
    let report = row.report;
    // Postgres drivers differ on whether JSONB arrives parsed or as text.
    if (typeof report === 'string') {
      try {
        report = JSON.parse(report);
      } catch {
        return null;
      }
    }
    if (!report || typeof report !== 'object') return null;
    return { report, score: row.score };
  };

  let opsSinceSweep = 0;

  /**
   * Drop reports past the retention window.
   *
   * Best-effort and fire-and-forget. A sweep that fails must not fail a score,
   * and a slow sweep must not delay one — the same rule as every other cache
   * operation here.
   *
   * The cutoff is computed in JavaScript and passed as a parameter rather than
   * built with SQL interval arithmetic: it keeps the statement fully
   * parameterised, and it avoids depending on how the driver types an integer
   * inside `INTERVAL`. The number itself is validated by retentionDays().
   */
  const maybeSweep = () => {
    opsSinceSweep += 1;
    if (opsSinceSweep < SWEEP_EVERY) return;
    opsSinceSweep = 0;
    const cutoff = new Date(Date.now() - retentionDays() * 24 * 60 * 60 * 1000);
    Promise.resolve()
      .then(
        () => prisma.$executeRaw`
          DELETE FROM "ScoreCache" WHERE "updatedAt" < ${cutoff}
        `,
      )
      .catch((error) =>
        console.warn('[SCORE-CACHE] retention sweep failed:', error?.message || error),
      );
  };

  return {
    shared: true,

    async read(hash) {
      maybeSweep();
      const rows = await prisma.$queryRaw`
        SELECT "report", "score" FROM "ScoreCache" WHERE "hash" = ${hash} LIMIT 1
      `;
      return decode(rows && rows[0]);
    },

    async remember(hash, report, score) {
      maybeSweep();
      await prisma.$executeRaw`
        INSERT INTO "ScoreCache" ("hash", "report", "score")
        VALUES (${hash}, ${JSON.stringify(report)}::jsonb, ${score})
        ON CONFLICT ("hash") DO NOTHING
      `;
      // Re-read rather than returning what we just computed. Two visitors can
      // submit the same new letter at the same moment; both call the model, one
      // insert wins, and this makes both of them return the winner's number
      // instead of disagreeing on the very first pair to see the letter.
      return decode((await prisma.$queryRaw`
        SELECT "report", "score" FROM "ScoreCache" WHERE "hash" = ${hash} LIMIT 1
      `)[0]);
    },

    async recordHit(hash) {
      await prisma.$executeRaw`
        UPDATE "ScoreCache"
        SET "hits" = "hits" + 1, "updatedAt" = NOW()
        WHERE "hash" = ${hash}
      `;
    },
  };
}

const warned = new Set();

function warnOnce(reason) {
  if (warned.has('score-cache')) return;
  warned.add('score-cache');
  console.warn(
    `[SCORE-CACHE] Scoring is being cached in-process only (${reason}). ` +
      'A letter scored on one instance can still score differently on another. ' +
      'The cache becomes shared once DATABASE_URL is set.',
  );
}

/**
 * Build the cache. Prefers the database, degrades to the process rather than
 * failing — an unreachable cache must cost a visitor nothing.
 *
 * @param {object} [opts]
 * @param {object} [opts.prisma] Injected client (tests).
 * @param {object} [opts.adapter] Injected cache (tests).
 */
function createScoreCache(opts = {}) {
  if (opts.adapter) return opts.adapter;

  let client = opts.prisma;
  if (!client && process.env.DATABASE_URL) {
    try {
      // Required lazily: a unit test that only reads the cache should not need a
      // generated Prisma client.
      const { PrismaClient } = require('@prisma/client');
      client = new PrismaClient();
    } catch (error) {
      warnOnce(`Prisma client unavailable: ${error?.message || error}`);
    }
  }

  if (!client) {
    warnOnce(process.env.DATABASE_URL ? 'no usable database client' : 'DATABASE_URL is not set');
    return createMemoryScoreCache();
  }

  return createPrismaScoreCache(client);
}

function numericScore(report) {
  const score = Number(report?.score);
  return Number.isFinite(score) ? Math.round(score) : 0;
}

/**
 * Return the report for `text`, scoring it only if we have not seen it before.
 *
 * This is the whole guarantee in one place: the second visitor to submit a given
 * letter gets the first visitor's number, not a fresh roll of the dice. Every
 * cache operation is best-effort — an unreachable cache must cost a visitor
 * nothing, so both sides fall through to scoring normally.
 *
 * @param {object}   opts
 * @param {object}   opts.cache   From createScoreCache()
 * @param {string}   opts.text    The letter, normalised or not
 * @param {Function} opts.compute Called only on a miss; returns the report
 * @param {Function} [opts.onError] Observes cache failures
 * @returns {Promise<{report: object, cached: boolean, hash: string|null}>}
 */
async function scoreOnce({ cache, text, compute, onError }) {
  const report = (error) => {
    if (typeof onError === 'function') onError(error);
  };

  const hash = hashLetter(text);

  if (hash) {
    try {
      const hit = await cache.read(hash);
      if (hit && hit.report) {
        // Telemetry only — a failed counter must not cost the visitor a score.
        Promise.resolve(cache.recordHit(hash)).catch(() => {});
        return { report: hit.report, cached: true, hash };
      }
    } catch (error) {
      report(error);
    }
  }

  const fresh = await compute();

  if (hash) {
    try {
      // `remember` returns the canonical stored report, so two visitors who
      // submit the same new letter at once both get the winner's number.
      const stored = await cache.remember(hash, fresh, numericScore(fresh));
      if (stored?.report) return { report: stored.report, cached: false, hash };
    } catch (error) {
      report(error);
    }
  }

  return { report: fresh, cached: false, hash };
}

module.exports = {
  TABLE,
  DEFAULT_RETENTION_DAYS,
  SWEEP_EVERY,
  retentionDays,
  normalizeLetter,
  hashLetter,
  numericScore,
  scoreOnce,
  createScoreCache,
  createMemoryScoreCache,
  createPrismaScoreCache,
};
