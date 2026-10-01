-- Error observability.
--
-- Widens ErrorLog so a captured failure can answer the question that matters
-- after launch: which account, which tier, which endpoint, and why. Additive
-- and idempotent, like the migrations before it, so re-running is safe.
--
-- Every column is nullable, so the existing writers (auth, admin, stripe
-- webhook) keep working untouched.

ALTER TABLE "ErrorLog" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "ErrorLog" ADD COLUMN IF NOT EXISTS "stack" TEXT;
ALTER TABLE "ErrorLog" ADD COLUMN IF NOT EXISTS "status" INTEGER;
ALTER TABLE "ErrorLog" ADD COLUMN IF NOT EXISTS "method" TEXT;
ALTER TABLE "ErrorLog" ADD COLUMN IF NOT EXISTS "path" TEXT;
ALTER TABLE "ErrorLog" ADD COLUMN IF NOT EXISTS "userEmail" TEXT;
ALTER TABLE "ErrorLog" ADD COLUMN IF NOT EXISTS "tier" TEXT;
ALTER TABLE "ErrorLog" ADD COLUMN IF NOT EXISTS "requestId" TEXT;
ALTER TABLE "ErrorLog" ADD COLUMN IF NOT EXISTS "meta" JSONB;
ALTER TABLE "ErrorLog" ADD COLUMN IF NOT EXISTS "fingerprint" TEXT;

-- Severity now defaults to a real failure rather than "info".
ALTER TABLE "ErrorLog" ALTER COLUMN "severity" SET DEFAULT 'error';

CREATE INDEX IF NOT EXISTS "ErrorLog_userId_idx" ON "ErrorLog"("userId");
CREATE INDEX IF NOT EXISTS "ErrorLog_fingerprint_createdAt_idx" ON "ErrorLog"("fingerprint", "createdAt");
