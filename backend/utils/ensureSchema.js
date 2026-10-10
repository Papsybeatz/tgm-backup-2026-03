/**
 * ensureSchema — idempotently guarantee the Steve tables/columns exist.
 *
 * Why not `prisma migrate deploy`
 * ----------------------------------------------------------------------------
 * That command cannot work against this database, and the production log finally
 * said so:
 *
 *   The datasource provider `postgresql` in your schema does not match the one
 *   in migration_lock.toml, `sqlite`.   Error: P3019
 *
 * Two separate problems sit behind it:
 *
 *   1. backend/prisma/migrations/migration_lock.toml is committed with
 *      provider = "sqlite" while schema.prisma says "postgresql", so Prisma
 *      refuses to run at all.
 *   2. The oldest migrations were GENERATED for SQLite. They use `DATETIME`,
 *      which is not a Postgres type, so even past the lock file the first
 *      migration would fail. And because the tables already exist in production
 *      (users, drafts, billing all work), `CREATE TABLE` would then fail on
 *      "already exists" anyway.
 *
 * A broken history like that needs a deliberate baseline, not a clever command.
 * Meanwhile Steve's session store silently falls back to memory when
 * AssistantSession is unusable — so every deploy wiped in-flight conversations
 * and the only symptom was a `mem_` session id.
 *
 * This module does the narrow, safe thing: `CREATE TABLE IF NOT EXISTS` and
 * `ADD COLUMN IF NOT EXISTS` for exactly the objects Steve needs, so it can run
 * on every boot and on any state of the database. It is not a replacement for a
 * proper migration history — it is a parachute.
 *
 * Every statement is executed independently so one failure cannot mask the rest,
 * and nothing here ever blocks the server from starting.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const STATEMENTS = [
  {
    label: 'AssistantSession table',
    sql: `CREATE TABLE IF NOT EXISTS "AssistantSession" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "clientId" TEXT,
      "status" TEXT NOT NULL DEFAULT 'intake',
      "order" JSONB NOT NULL DEFAULT '{}'::jsonb,
      "draftId" TEXT,
      "docTitle" TEXT,
      "docHtml" TEXT,
      "style" TEXT NOT NULL DEFAULT 'full_proposal',
      "score" INTEGER,
      "scoreReport" JSONB,
      "lastIntent" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AssistantSession_pkey" PRIMARY KEY ("id")
    )`,
  },
  {
    label: 'AssistantSession.clientId column',
    sql: `ALTER TABLE "AssistantSession" ADD COLUMN IF NOT EXISTS "clientId" TEXT`,
  },
  {
    label: 'AssistantSession.order column',
    sql: `ALTER TABLE "AssistantSession" ADD COLUMN IF NOT EXISTS "order" JSONB`,
  },
  {
    label: 'AssistantSession.docHtml column',
    sql: `ALTER TABLE "AssistantSession" ADD COLUMN IF NOT EXISTS "docHtml" TEXT`,
  },
  {
    label: 'AssistantMessage table',
    sql: `CREATE TABLE IF NOT EXISTS "AssistantMessage" (
      "id" TEXT NOT NULL,
      "sessionId" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AssistantMessage_pkey" PRIMARY KEY ("id")
    )`,
  },
  {
    label: 'AssistantSession indexes',
    sql: `CREATE INDEX IF NOT EXISTS "AssistantSession_userId_updatedAt_idx" ON "AssistantSession"("userId", "updatedAt")`,
  },
  {
    label: 'AssistantSession client index',
    sql: `CREATE INDEX IF NOT EXISTS "AssistantSession_userId_clientId_idx" ON "AssistantSession"("userId", "clientId")`,
  },
  {
    label: 'AssistantSession draft index',
    sql: `CREATE INDEX IF NOT EXISTS "AssistantSession_draftId_idx" ON "AssistantSession"("draftId")`,
  },
  {
    label: 'AssistantMessage index',
    sql: `CREATE INDEX IF NOT EXISTS "AssistantMessage_sessionId_createdAt_idx" ON "AssistantMessage"("sessionId", "createdAt")`,
  },
  {
    label: 'Draft.order column',
    sql: `ALTER TABLE "Draft" ADD COLUMN IF NOT EXISTS "order" JSONB`,
  },
  {
    label: 'Draft.clientId column',
    sql: `ALTER TABLE "Draft" ADD COLUMN IF NOT EXISTS "clientId" TEXT`,
  },
  {
    label: 'Draft client index',
    sql: `CREATE INDEX IF NOT EXISTS "Draft_clientId_idx" ON "Draft"("clientId")`,
  },

  // ---------------------------------------------------------------------------
  // Error observability.
  //
  // The matching migration exists, but this repo's migrate history has been
  // unreliable before (see the note at the top of this file), and a failure
  // capture layer that fails silently would defeat its own entire purpose. So
  // it gets the same parachute as Steve's tables: create if absent, add each
  // column if absent, on every boot.
  // ---------------------------------------------------------------------------
  {
    label: 'ErrorLog table',
    sql: `CREATE TABLE IF NOT EXISTS "ErrorLog" (
      "id" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "endpoint" TEXT,
      "userId" TEXT,
      "severity" TEXT NOT NULL DEFAULT 'error',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
    )`,
  },
  {
    label: 'ErrorLog.source column',
    sql: `ALTER TABLE "ErrorLog" ADD COLUMN IF NOT EXISTS "source" TEXT`,
  },
  {
    label: 'ErrorLog.stack column',
    sql: `ALTER TABLE "ErrorLog" ADD COLUMN IF NOT EXISTS "stack" TEXT`,
  },
  {
    label: 'ErrorLog.status column',
    sql: `ALTER TABLE "ErrorLog" ADD COLUMN IF NOT EXISTS "status" INTEGER`,
  },
  {
    label: 'ErrorLog.method column',
    sql: `ALTER TABLE "ErrorLog" ADD COLUMN IF NOT EXISTS "method" TEXT`,
  },
  {
    label: 'ErrorLog.path column',
    sql: `ALTER TABLE "ErrorLog" ADD COLUMN IF NOT EXISTS "path" TEXT`,
  },
  {
    label: 'ErrorLog.userEmail column',
    sql: `ALTER TABLE "ErrorLog" ADD COLUMN IF NOT EXISTS "userEmail" TEXT`,
  },
  {
    label: 'ErrorLog.tier column',
    sql: `ALTER TABLE "ErrorLog" ADD COLUMN IF NOT EXISTS "tier" TEXT`,
  },
  {
    label: 'ErrorLog.requestId column',
    sql: `ALTER TABLE "ErrorLog" ADD COLUMN IF NOT EXISTS "requestId" TEXT`,
  },
  {
    label: 'ErrorLog.meta column',
    sql: `ALTER TABLE "ErrorLog" ADD COLUMN IF NOT EXISTS "meta" JSONB`,
  },
  {
    label: 'ErrorLog.fingerprint column',
    sql: `ALTER TABLE "ErrorLog" ADD COLUMN IF NOT EXISTS "fingerprint" TEXT`,
  },
  {
    label: 'ErrorLog user index',
    sql: `CREATE INDEX IF NOT EXISTS "ErrorLog_userId_idx" ON "ErrorLog"("userId")`,
  },
  {
    label: 'ErrorLog fingerprint index',
    sql: `CREATE INDEX IF NOT EXISTS "ErrorLog_fingerprint_createdAt_idx" ON "ErrorLog"("fingerprint", "createdAt")`,
  },
  {
    label: 'ErrorLog createdAt index',
    sql: `CREATE INDEX IF NOT EXISTS "ErrorLog_createdAt_idx" ON "ErrorLog"("createdAt")`,
  },
  {
    label: 'ErrorLog severity index',
    sql: `CREATE INDEX IF NOT EXISTS "ErrorLog_severity_idx" ON "ErrorLog"("severity")`,
  },

  // ---------------------------------------------------------------------------
  // Invite-request waitlist.
  //
  // Same reasoning as ErrorLog above, but with a sharper edge: the data this
  // replaces was destroyed by exactly the event this parachute guards against.
  // A redeploy wiping the waitlist is the bug; if the migration did not apply
  // we would simply reproduce it with a table instead of a file.
  // ---------------------------------------------------------------------------
  {
    label: 'InviteRequest table',
    sql: `CREATE TABLE IF NOT EXISTS "InviteRequest" (
      "id" TEXT NOT NULL,
      "name" TEXT,
      "email" TEXT NOT NULL,
      "organization" TEXT,
      "reason" TEXT,
      "tier" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "InviteRequest_pkey" PRIMARY KEY ("id")
    )`,
  },
  {
    label: 'InviteRequest email unique index',
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS "InviteRequest_email_key" ON "InviteRequest"("email")`,
  },
  {
    label: 'InviteRequest status index',
    sql: `CREATE INDEX IF NOT EXISTS "InviteRequest_status_createdAt_idx" ON "InviteRequest"("status", "createdAt")`,
  },

  // ---------------------------------------------------------------------------
  // Testimonial — social proof from real users.
  //
  // This block previously sat AFTER the `return` in ensureSchema(), so it never
  // ran. On a database that did not already have the table, quotes could never
  // have been collected. Moved into STATEMENTS, where it is actually reached.
  // ---------------------------------------------------------------------------
  {
    label: 'Testimonial table',
    sql: `CREATE TABLE IF NOT EXISTS "Testimonial" (
      "id" TEXT NOT NULL,
      "quote" TEXT NOT NULL,
      "role" TEXT,
      "orgType" TEXT,
      "region" TEXT,
      "email" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "source" TEXT NOT NULL DEFAULT 'website',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
    )`,
  },
  {
    label: 'Testimonial status index',
    sql: `CREATE INDEX IF NOT EXISTS "Testimonial_status_idx" ON "Testimonial"("status")`,
  },
  {
    label: 'Testimonial createdAt index',
    sql: `CREATE INDEX IF NOT EXISTS "Testimonial_createdAt_idx" ON "Testimonial"("createdAt")`,
  },

  // ---------------------------------------------------------------------------
  // Funder Intelligence API — intake and paid cycles.
  //
  // No mechanism ever created these tables. The only migration defining them
  // lives in the legacy root prisma/migrations, while nothing in the deploy runs
  // `prisma migrate deploy` — railway.json starts `node server.js`, and this
  // parachute is what actually creates tables. With no table and no client
  // model, every funder write threw, and the public intake swallowed the error
  // and reported success to the applicant. Both halves are now fixed: the models
  // are in backend/prisma/schema.prisma, and the tables are created here.
  //
  // `status` is TEXT rather than a Postgres enum, matching the schema, so these
  // statements stay idempotent and safe to run on every boot.
  // ---------------------------------------------------------------------------
  {
    label: 'FunderLead table',
    sql: `CREATE TABLE IF NOT EXISTS "FunderLead" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "orgName" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "role" TEXT,
      "website" TEXT,
      "country" TEXT,
      "planRequested" TEXT,
      "cycleName" TEXT,
      "cycleYear" INTEGER,
      "expectedVolume" INTEGER,
      "message" TEXT,
      "source" TEXT NOT NULL DEFAULT 'funder-api-request',
      "riskScore" INTEGER,
      "riskReasons" TEXT[],
      "status" TEXT NOT NULL DEFAULT 'pending_review',
      "sidecarFunderId" TEXT,
      "orgApiKey" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "FunderLead_pkey" PRIMARY KEY ("id")
    )`,
  },
  {
    label: 'FunderLead email index',
    sql: `CREATE INDEX IF NOT EXISTS "FunderLead_email_idx" ON "FunderLead"("email")`,
  },
  {
    label: 'FunderLead status index',
    sql: `CREATE INDEX IF NOT EXISTS "FunderLead_status_idx" ON "FunderLead"("status")`,
  },
  {
    label: 'FunderCycle table',
    sql: `CREATE TABLE IF NOT EXISTS "FunderCycle" (
      "id" TEXT NOT NULL,
      "funderLeadId" TEXT NOT NULL,
      "cycleName" TEXT NOT NULL,
      "cycleYear" INTEGER NOT NULL,
      "planKey" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'pending_payment',
      "stripeCheckoutSessionId" TEXT,
      "stripePaymentIntentId" TEXT,
      "stripeCustomerId" TEXT,
      "stripePriceId" TEXT,
      "sidecarCycleId" TEXT,
      "applicationsAllowed" INTEGER NOT NULL DEFAULT 50,
      "applicationsUsed" INTEGER NOT NULL DEFAULT 0,
      "activatedAt" TIMESTAMP(3),
      "expiresAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "FunderCycle_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "FunderCycle_funderLeadId_fkey" FOREIGN KEY ("funderLeadId")
        REFERENCES "FunderLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )`,
  },
  {
    label: 'FunderCycle unique index',
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS "FunderCycle_funderLeadId_cycleName_cycleYear_key" ON "FunderCycle"("funderLeadId", "cycleName", "cycleYear")`,
  },
  {
    label: 'FunderCycle status index',
    sql: `CREATE INDEX IF NOT EXISTS "FunderCycle_status_idx" ON "FunderCycle"("status")`,
  },

  // ---------------------------------------------------------------------------
  // Rate-limit counters — the free funnel's daily walls.
  //
  // These used to live in express-rate-limit's in-process Map, so a deploy or a
  // second instance reset them: "one rewrite per day" was really "one per day
  // per process", and the 6/day score cap widened as the service scaled. The
  // counter now lives in the database, and the limiter moves it with a single
  // atomic upsert (see utils/rateLimitStore.js).
  //
  // The `resetAt` index exists because expired rows are swept opportunistically
  // and that sweep must not scan the whole table.
  // ---------------------------------------------------------------------------
  {
    label: 'RateLimitCounter table',
    sql: `CREATE TABLE IF NOT EXISTS "RateLimitCounter" (
      "id" TEXT NOT NULL,
      "count" INTEGER NOT NULL DEFAULT 0,
      "resetAt" TIMESTAMP(3) NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "RateLimitCounter_pkey" PRIMARY KEY ("id")
    )`,
  },
  {
    label: 'RateLimitCounter resetAt index',
    sql: `CREATE INDEX IF NOT EXISTS "RateLimitCounter_resetAt_idx" ON "RateLimitCounter"("resetAt")`,
  },
];

/** Is the Steve store actually able to use the database now? */
async function verifyStevesTables() {
  try {
    await prisma.assistantSession.findFirst({ where: { userId: '__schema_probe__' } });
    return { ok: true };
  } catch (error) {
    let reason = '';
    try {
      reason = String(error?.message || '').trim();
    } catch { /* ignore */ }
    if (!reason) {
      try {
        reason = require('util').inspect(error, { depth: 2, breakLength: Infinity });
      } catch {
        reason = 'unknown error';
      }
    }
    return { ok: false, reason: String(reason).replace(/\s+/g, ' ').slice(0, 300), code: error?.code };
  }
}

/**
 * @returns {Promise<{ok: boolean, applied: string[], failed: Array<{label:string,error:string}>, verify: object}>}
 */
async function ensureSchema() {
  const applied = [];
  const failed = [];

  if (!process.env.DATABASE_URL) {
    console.warn('[SCHEMA] DATABASE_URL not set — skipping');
    return { ok: false, applied, failed, verify: { ok: false, reason: 'DATABASE_URL not set' } };
  }

  for (const { label, sql } of STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(sql);
      applied.push(label);
    } catch (error) {
      // Prisma connection failures often carry an empty `.message`, so fall back
      // to the code — an empty log line tells the operator nothing.
      let reason = '';
      try {
        reason = String(error?.message || '').trim();
      } catch { /* ignore */ }
      if (!reason) reason = error?.code ? `code ${error.code}` : '';
      if (!reason) {
        // util.inspect reads non-enumerable Error props and survives any shape —
        // Prisma connection errors were producing a blank line here.
        try {
          reason = require('util').inspect(error, { depth: 2, breakLength: Infinity });
        } catch {
          reason = '';
        }
      }
      if (!reason || reason === '{}') reason = 'unknown error (nothing to report)';
      reason = String(reason).replace(/\s+/g, ' ').slice(0, 400);
      // Independent execution: one failure must not hide the others.
      failed.push({ label, error: reason });
      console.error(`[SCHEMA] ${label} FAILED: ${reason}`);
    }
  }

  const verify = await verifyStevesTables();

  if (verify.ok) {
    console.log(`[SCHEMA] OK — Steve's tables are usable (${applied.length} statements applied)`);
  } else {
    console.error('[SCHEMA] Steve\'s tables are STILL unusable:', verify.reason, verify.code ? `(code ${verify.code})` : '');
    console.error('[SCHEMA] session persistence will remain on the in-memory fallback');
  }

  return { ok: verify.ok, applied, failed, verify };
}

/**
 * Is failure capture actually able to write?
 *
 * Selects the new columns specifically, so this reports false when the table
 * exists but the widening never applied — which is the failure mode that would
 * otherwise leave the layer looking installed and capturing nothing.
 */
async function verifyErrorCapture() {
  try {
    await prisma.errorLog.findFirst({
      where: { id: '__error_capture_probe__' },
      select: { id: true, tier: true, requestId: true, fingerprint: true, status: true },
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: String(error?.message || error?.code || 'unknown').slice(0, 200) };
  }
}

module.exports = { ensureSchema, verifyStevesTables, verifyErrorCapture, STATEMENTS };
