-- CreateEnum
CREATE TYPE "FunderLeadStatus" AS ENUM ('pending_review', 'approved', 'rejected', 'sandbox_issued', 'production_active');

-- CreateEnum
CREATE TYPE "FunderCycleStatus" AS ENUM ('pending_payment', 'active', 'expired', 'cancelled');

-- CreateTable
CREATE TABLE "FunderLead" (
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
    "status"         "FunderLeadStatus" NOT NULL DEFAULT 'pending_review',
    "sidecarFunderId" TEXT,
    "orgApiKey"      TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FunderLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunderCycle" (
    "id"                      TEXT NOT NULL,
    "funderLeadId"            TEXT NOT NULL,
    "cycleName"               TEXT NOT NULL,
    "cycleYear"               INTEGER NOT NULL,
    "planKey"                 TEXT NOT NULL,
    "status"                  "FunderCycleStatus" NOT NULL DEFAULT 'pending_payment',
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
    "updatedAt"               TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FunderCycle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FunderLead_email_idx" ON "FunderLead"("email");

-- CreateIndex
CREATE INDEX "FunderLead_status_idx" ON "FunderLead"("status");

-- CreateIndex
CREATE INDEX "FunderCycle_status_idx" ON "FunderCycle"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FunderCycle_funderLeadId_cycleName_cycleYear_key"
    ON "FunderCycle"("funderLeadId", "cycleName", "cycleYear");

-- AddForeignKey
ALTER TABLE "FunderCycle" ADD CONSTRAINT "FunderCycle_funderLeadId_fkey"
    FOREIGN KEY ("funderLeadId") REFERENCES "FunderLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
