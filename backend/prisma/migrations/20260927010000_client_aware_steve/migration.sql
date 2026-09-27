-- Client-aware Steve. Idempotent for the same reason as the migrations above.
ALTER TABLE "AssistantSession" ADD COLUMN IF NOT EXISTS "clientId" TEXT;
ALTER TABLE "Draft" ADD COLUMN IF NOT EXISTS "clientId" TEXT;

CREATE INDEX IF NOT EXISTS "AssistantSession_userId_clientId_idx" ON "AssistantSession"("userId", "clientId");
CREATE INDEX IF NOT EXISTS "Draft_clientId_idx" ON "Draft"("clientId");
