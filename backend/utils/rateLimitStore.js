// utils/rateLimitStore.js
// A rate-limit store that survives restarts and is shared by every instance.
//
// Why this exists
// ----------------------------------------------------------------------------
// express-rate-limit's default store is an in-process Map. That is fine for a
// hot-loop guard, but it is the wrong tool for a rule the product actually
// promises. The free funnel has two such rules:
//
//   * one rewrite per IP per day   (publicRewriteDailyLimiter)
//   * six free Checkmate scores per IP per day (publicScoreDailyLimiter)
//
// Both were enforced from that Map, which meant they were enforced by a
// process. A Railway deploy, a crash, a restart, or a second instance all
// reset the counter — and a visitor who noticed could spend the day's
// allowance again simply by waiting for a deploy. Worse, with more than one
// instance the "one per day" rule became "one per day per instance", so the
// wall silently widened as the service scaled.
//
// The rule is about the visitor, not about a process, so the counter has to
// outlive the process. This module stores it in the Postgres database the rest
// of the app already depends on.
//
// Correctness under concurrency
// ----------------------------------------------------------------------------
// Two instances can increment the same key at the same instant. A
// read-then-write would lose one of those increments, which would let a
// visitor through the wall exactly when traffic is high. So the increment is a
// single atomic `INSERT ... ON CONFLICT DO UPDATE`, and the window rollover is
// decided inside that same statement by comparing `resetAt` to `NOW()`. The
// database serialises it; no application-level lock is needed.
//
// Failing open, on purpose
// ----------------------------------------------------------------------------
// These limiters protect a monetisation wall, not the integrity of the data.
// If the database is unreachable, the choice is between letting a few extra
// free scores through and refusing every visitor on the site. We let them
// through, loudly. `passOnStoreError: true` on the limiters is what makes that
// explicit rather than accidental.
//
// There is also a deliberate fallback to an in-process store when
// DATABASE_URL is absent, so a local run or a unit test does not need a
// database to exercise the routes. That fallback is logged once, because
// silently degrading to the old behaviour is how this bug would come back.

const TABLE = 'RateLimitCounter';

/* ── adapters ──────────────────────────────────────────────────────────────
 * The store logic (namespacing, window rollover, the express-rate-limit
 * contract) is separated from the storage. That keeps the semantics testable
 * without a live Postgres, and keeps the SQL in one small, auditable place.
 */

/**
 * In-process adapter. Used only when there is no database configured — see the
 * fallback note above. It deliberately mirrors the SQL adapter's semantics so
 * behaviour does not change shape between the two.
 */
function createMemoryAdapter() {
  const rows = new Map();

  return {
    async bump(id, resetAt) {
      const now = Date.now();
      const existing = rows.get(id);
      if (!existing || existing.resetAt.getTime() <= now) {
        const row = { count: 1, resetAt: new Date(resetAt) };
        rows.set(id, row);
        return { count: row.count, resetAt: row.resetAt };
      }
      existing.count += 1;
      return { count: existing.count, resetAt: existing.resetAt };
    },

    async read(id) {
      const row = rows.get(id);
      return row ? { count: row.count, resetAt: row.resetAt } : null;
    },

    async decrement(id) {
      const row = rows.get(id);
      if (row && row.count > 0) row.count -= 1;
    },

    async drop(id) {
      rows.delete(id);
    },

    async dropAll(prefix) {
      for (const key of Array.from(rows.keys())) {
        if (key.startsWith(prefix)) rows.delete(key);
      }
    },
  };
}

// Rows are one per (namespace, key) per window, so a busy site accumulates
// them. They are useless once expired, so sweep them occasionally rather than
// letting the table grow forever. A counter beats a timer here: no interval to
// leak, no work at all on a quiet instance.
const SWEEP_EVERY = 500;
const SWEEP_OLDER_THAN = '2 days';
let bumpsSinceSweep = 0;

/**
 * Postgres adapter. The upsert is the whole point of the module, so it is
 * worth reading carefully:
 *
 *   * `ON CONFLICT ("id")` makes concurrent increments serialise on the row
 *     instead of racing.
 *   * the `count` CASE resets to 1 when the stored window has already expired,
 *     and otherwise increments — so an expired window is never incremented
 *     into the next one.
 *   * the `resetAt` CASE moves the window forward only on that same rollover,
 *     so a live window keeps its original expiry.
 *   * `RETURNING` gives back the post-update truth, which is what the limiter
 *     reports as `totalHits`/`resetTime`.
 */
function createPrismaAdapter(prisma) {
  return {
    async bump(id, resetAt) {
      const rows = await prisma.$queryRaw`
        INSERT INTO "RateLimitCounter" ("id", "count", "resetAt", "updatedAt")
        VALUES (${id}, 1, ${resetAt}::timestamp(3), NOW())
        ON CONFLICT ("id") DO UPDATE SET
          "count" = CASE
            WHEN "RateLimitCounter"."resetAt" <= NOW() THEN 1
            ELSE "RateLimitCounter"."count" + 1
          END,
          "resetAt" = CASE
            WHEN "RateLimitCounter"."resetAt" <= NOW() THEN ${resetAt}::timestamp(3)
            ELSE "RateLimitCounter"."resetAt"
          END,
          "updatedAt" = NOW()
        RETURNING "count", "resetAt"
      `;

      bumpsSinceSweep += 1;
      if (bumpsSinceSweep >= SWEEP_EVERY) {
        bumpsSinceSweep = 0;
        // Best-effort housekeeping: a failure here must never fail a request.
        try {
          await prisma.$executeRawUnsafe(
            `DELETE FROM "${TABLE}" WHERE "resetAt" < NOW() - INTERVAL '${SWEEP_OLDER_THAN}'`,
          );
        } catch { /* housekeeping is not load-bearing */ }
      }

      const row = rows[0];
      return { count: Number(row.count), resetAt: new Date(row.resetAt) };
    },

    async read(id) {
      const rows = await prisma.$queryRaw`
        SELECT "count", "resetAt" FROM "RateLimitCounter"
        WHERE "id" = ${id}
        LIMIT 1
      `;
      if (!rows.length) return null;
      return { count: Number(rows[0].count), resetAt: new Date(rows[0].resetAt) };
    },

    async decrement(id) {
      await prisma.$executeRaw`
        UPDATE "RateLimitCounter"
        SET "count" = GREATEST("count" - 1, 0), "updatedAt" = NOW()
        WHERE "id" = ${id}
      `;
    },

    async drop(id) {
      await prisma.$executeRaw`DELETE FROM "RateLimitCounter" WHERE "id" = ${id}`;
    },

    async dropAll(prefix) {
      await prisma.$executeRaw`DELETE FROM "RateLimitCounter" WHERE "id" LIKE ${`${prefix}%`}`;
    },
  };
}

/* ── the store ───────────────────────────────────────────────────────────── */

/**
 * Implements express-rate-limit's `Store` contract (v8): `init`, `get`,
 * `increment`, `decrement`, `resetKey`, `resetAll`, `shutdown`.
 *
 * `localKeys = false` tells express-rate-limit that keys incremented here DO
 * affect other instances. That is the truthful answer, and it is what stops the
 * library warning about double-counting.
 */
class PersistentRateLimitStore {
  constructor({ namespace, adapter }) {
    this.namespace = namespace;
    // The library reads `store.prefix` when checking that one key is not
    // counted twice by two different stores; without it, two limiters sharing
    // one table would look like a misconfiguration.
    this.prefix = namespace;
    this.localKeys = false;
    this.adapter = adapter;
    // Replaced by init() with the limiter's real window before first use.
    this.windowMs = 24 * 60 * 60 * 1000;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  // Namespacing matters: every limiter is handed the same key (the client IP),
  // so without it the daily score cap and the daily rewrite cap would share one
  // counter and the rewrite would silently consume score allowance.
  _id(key) {
    return `${this.namespace}:${key}`;
  }

  async get(key) {
    const row = await this.adapter.read(this._id(key));
    if (!row) return undefined;
    // An expired window is indistinguishable from no window to a caller.
    if (row.resetAt.getTime() <= Date.now()) return undefined;
    return { totalHits: row.count, resetTime: row.resetAt };
  }

  async increment(key) {
    const resetAt = new Date(Date.now() + this.windowMs);
    const row = await this.adapter.bump(this._id(key), resetAt);
    return { totalHits: row.count, resetTime: row.resetAt };
  }

  async decrement(key) {
    await this.adapter.decrement(this._id(key));
  }

  async resetKey(key) {
    await this.adapter.drop(this._id(key));
  }

  async resetAll() {
    await this.adapter.dropAll(`${this.namespace}:`);
  }

  shutdown() {
    // Nothing to release: no timers, and the client is shared.
  }
}

/* ── construction ────────────────────────────────────────────────────────── */

const warned = new Set();

function warnOnce(namespace, reason) {
  if (warned.has(namespace)) return;
  warned.add(namespace);
  console.warn(
    `[RATE-LIMIT] "${namespace}" is using the in-process store (${reason}). ` +
    'Its counter will NOT survive a restart and is NOT shared between ' +
    'instances — the limit is advisory until this is fixed.',
  );
}

/**
 * Build a store for one limiter.
 *
 * @param {string} namespace  Distinguishes this limiter's counters. Use a
 *                            different value per limiter.
 * @param {object} [opts]
 * @param {object} [opts.prisma]  Injected client (tests). Defaults to a shared
 *                                client when DATABASE_URL is present.
 * @param {object} [opts.adapter] Injected adapter (tests).
 */
function createRateLimitStore(namespace, opts = {}) {
  if (opts.adapter) {
    return new PersistentRateLimitStore({ namespace, adapter: opts.adapter });
  }

  let client = opts.prisma;
  if (!client && process.env.DATABASE_URL) {
    try {
      // Required lazily: a unit test that only reads these limiters should not
      // need a generated Prisma client.
      const { PrismaClient } = require('@prisma/client');
      client = new PrismaClient();
    } catch (error) {
      warnOnce(namespace, `Prisma client unavailable: ${error?.message || error}`);
    }
  }

  if (!client) {
    if (!warned.has(namespace)) {
      warnOnce(namespace, process.env.DATABASE_URL
        ? 'no usable database client'
        : 'DATABASE_URL is not set');
    }
    return new PersistentRateLimitStore({ namespace, adapter: createMemoryAdapter() });
  }

  return new PersistentRateLimitStore({ namespace, adapter: createPrismaAdapter(client) });
}

module.exports = {
  createRateLimitStore,
  PersistentRateLimitStore,
  createMemoryAdapter,
  createPrismaAdapter,
  TABLE,
};
