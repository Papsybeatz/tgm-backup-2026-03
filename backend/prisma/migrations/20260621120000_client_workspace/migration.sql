BEGIN;

ALTER TABLE "Draft" ADD COLUMN IF NOT EXISTS "clientId" TEXT;

CREATE TABLE IF NOT EXISTS "ClientFolder" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sector" TEXT,
  "state" TEXT,
  "funders" JSONB,
  "notes" TEXT,
  "brandLogoUrl" TEXT,
  "brandColor" TEXT,
  "contactInfo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientFolder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClientPermission" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "userId" TEXT,
  "email" TEXT,
  "role" TEXT NOT NULL DEFAULT 'viewer',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientPermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClientActivityLog" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "detail" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClientTemplate" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "isShared" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CheckmateReport" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "draftId" TEXT,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "strengths" JSONB NOT NULL,
  "weaknesses" JSONB NOT NULL,
  "missingComponents" JSONB NOT NULL,
  "complianceIssues" JSONB NOT NULL,
  "recommendedFixes" JSONB NOT NULL,
  "funderAlignment" JSONB NOT NULL,
  "exportedAs" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CheckmateReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClientDocument" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT,
  "url" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Draft_clientId_idx" ON "Draft"("clientId");
CREATE INDEX IF NOT EXISTS "Draft_userId_updatedAt_idx" ON "Draft"("userId", "updatedAt");
CREATE INDEX IF NOT EXISTS "ClientFolder_ownerId_idx" ON "ClientFolder"("ownerId");
CREATE INDEX IF NOT EXISTS "ClientFolder_state_idx" ON "ClientFolder"("state");
CREATE INDEX IF NOT EXISTS "ClientFolder_sector_idx" ON "ClientFolder"("sector");
CREATE INDEX IF NOT EXISTS "ClientPermission_clientId_idx" ON "ClientPermission"("clientId");
CREATE INDEX IF NOT EXISTS "ClientPermission_userId_idx" ON "ClientPermission"("userId");
CREATE INDEX IF NOT EXISTS "ClientPermission_email_idx" ON "ClientPermission"("email");
CREATE INDEX IF NOT EXISTS "ClientActivityLog_clientId_createdAt_idx" ON "ClientActivityLog"("clientId", "createdAt");
CREATE INDEX IF NOT EXISTS "ClientActivityLog_userId_idx" ON "ClientActivityLog"("userId");
CREATE INDEX IF NOT EXISTS "ClientTemplate_clientId_idx" ON "ClientTemplate"("clientId");
CREATE INDEX IF NOT EXISTS "ClientTemplate_userId_idx" ON "ClientTemplate"("userId");
CREATE INDEX IF NOT EXISTS "ClientTemplate_type_idx" ON "ClientTemplate"("type");
CREATE INDEX IF NOT EXISTS "CheckmateReport_clientId_createdAt_idx" ON "CheckmateReport"("clientId", "createdAt");
CREATE INDEX IF NOT EXISTS "CheckmateReport_draftId_idx" ON "CheckmateReport"("draftId");
CREATE INDEX IF NOT EXISTS "CheckmateReport_userId_idx" ON "CheckmateReport"("userId");
CREATE INDEX IF NOT EXISTS "ClientDocument_clientId_idx" ON "ClientDocument"("clientId");
CREATE INDEX IF NOT EXISTS "ClientDocument_userId_idx" ON "ClientDocument"("userId");

ALTER TABLE "ClientFolder" DROP CONSTRAINT IF EXISTS "ClientFolder_ownerId_fkey";
ALTER TABLE "ClientFolder"
  ADD CONSTRAINT "ClientFolder_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Draft" DROP CONSTRAINT IF EXISTS "Draft_clientId_fkey";
ALTER TABLE "Draft"
  ADD CONSTRAINT "Draft_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClientPermission" DROP CONSTRAINT IF EXISTS "ClientPermission_clientId_fkey";
ALTER TABLE "ClientPermission"
  ADD CONSTRAINT "ClientPermission_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientPermission" DROP CONSTRAINT IF EXISTS "ClientPermission_userId_fkey";
ALTER TABLE "ClientPermission"
  ADD CONSTRAINT "ClientPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClientActivityLog" DROP CONSTRAINT IF EXISTS "ClientActivityLog_clientId_fkey";
ALTER TABLE "ClientActivityLog"
  ADD CONSTRAINT "ClientActivityLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientActivityLog" DROP CONSTRAINT IF EXISTS "ClientActivityLog_userId_fkey";
ALTER TABLE "ClientActivityLog"
  ADD CONSTRAINT "ClientActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClientTemplate" DROP CONSTRAINT IF EXISTS "ClientTemplate_clientId_fkey";
ALTER TABLE "ClientTemplate"
  ADD CONSTRAINT "ClientTemplate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientTemplate" DROP CONSTRAINT IF EXISTS "ClientTemplate_userId_fkey";
ALTER TABLE "ClientTemplate"
  ADD CONSTRAINT "ClientTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CheckmateReport" DROP CONSTRAINT IF EXISTS "CheckmateReport_clientId_fkey";
ALTER TABLE "CheckmateReport"
  ADD CONSTRAINT "CheckmateReport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CheckmateReport" DROP CONSTRAINT IF EXISTS "CheckmateReport_draftId_fkey";
ALTER TABLE "CheckmateReport"
  ADD CONSTRAINT "CheckmateReport_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CheckmateReport" DROP CONSTRAINT IF EXISTS "CheckmateReport_userId_fkey";
ALTER TABLE "CheckmateReport"
  ADD CONSTRAINT "CheckmateReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientDocument" DROP CONSTRAINT IF EXISTS "ClientDocument_clientId_fkey";
ALTER TABLE "ClientDocument"
  ADD CONSTRAINT "ClientDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientDocument" DROP CONSTRAINT IF EXISTS "ClientDocument_userId_fkey";
ALTER TABLE "ClientDocument"
  ADD CONSTRAINT "ClientDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
