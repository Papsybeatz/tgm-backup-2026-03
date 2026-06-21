BEGIN;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboardingData" JSONB;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "audienceRole" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "workspaceMode" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pricingRecommendation" TEXT;

CREATE INDEX IF NOT EXISTS "User_audienceRole_idx" ON "User"("audienceRole");
CREATE INDEX IF NOT EXISTS "User_location_idx" ON "User"("location");
CREATE INDEX IF NOT EXISTS "User_workspaceMode_idx" ON "User"("workspaceMode");

COMMIT;
