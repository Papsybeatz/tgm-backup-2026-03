-- Funder Intelligence API — intake and paid cycles.
--
-- These two tables were previously defined ONLY in the legacy root
-- prisma/schema.prisma, while package.json points `prisma generate` at
-- backend/prisma/schema.prisma. The generated client therefore had no
-- prisma.funderLead / prisma.funderCycle, so all 15 call sites across
-- funderApiRequest.js, adminFunders.js, checkout.js and the Stripe webhook
-- threw at runtime — and the public intake swallowed the error and reported
-- success to the applicant.
--
-- This migration is written with IF NOT EXISTS on purpose. Nothing in the
-- deploy currently runs `prisma migrate deploy` (railway.json starts
-- `node server.js`, and utils/ensureSchema.js is the parachute that actually
-- creates tables), so these objects may already exist by the time this ever
-- executes. Idempotent DDL makes it safe in either direction.
--
-- `status` is TEXT rather than a Postgres enum, matching the schema, so the
-- column type agrees with what ensureSchema.js creates.

CREATE TABLE IF NOT EXISTS "FunderLead" (
    "id"             TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "orgName"        TEXT NOT NULL,
    "email"          TEXT NOT NULL,
    "role"           TEXT,
    "website"        TEXT,
    "country"        TEXT,
    "planRequested"  TEXT,
    "cycleName"      TEXT,
    "cycleYear"      INTEGER,
    "expectedVolume" INTEGER,
    "message"        TEXT,
    "source"         TEXT NOT NULL DEFAULT 'funder-api-request',
    "riskScore"      INTEGER,
    "riskReasons"    TEXT[],
    "status"         TEXT NOT NULL DEFAULT 'pending_review',
    "sidecarFunderId" TEXT,
    "orgApiKey"      TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FunderLead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FunderLead_email_idx" ON "FunderLead"("email");
CREATE INDEX IF NOT EXISTS "FunderLead_status_idx" ON "FunderLead"("status");

CREATE TABLE IF NOT EXISTS "FunderCycle" (
    "id"                      TEXT NOT NULL,
    "funderLeadId"            TEXT NOT NULL,
    "cycleName"               TEXT NOT NULL,
    "cycleYear"               INTEGER NOT NULL,
    "planKey"                 TEXT NOT NULL,
    "status"                  TEXT NOT NULL DEFAULT 'pending_payment',
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId"   TEXT,
    "stripeCustomerId"        TEXT,
    "stripePriceId"           TEXT,
    "sidecarCycleId"          TEXT,
    "applicationsAllowed"     INTEGER NOT NULL DEFAULT 50,
    "applicationsUsed"        INTEGER NOT NULL DEFAULT 0,
    "activatedAt"             TIMESTAMP(3),
    "expiresAt"               TIMESTAMP(3),
    "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FunderCycle_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FunderCycle_funderLeadId_fkey" FOREIGN KEY ("funderLeadId")
        REFERENCES "FunderLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "FunderCycle_funderLeadId_cycleName_cycleYear_key"
    ON "FunderCycle"("funderLeadId", "cycleName", "cycleYear");

CREATE INDEX IF NOT EXISTS "FunderCycle_status_idx" ON "FunderCycle"("status");
