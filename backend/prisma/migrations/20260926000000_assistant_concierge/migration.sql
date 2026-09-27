-- Steve — conversational grant concierge
--
-- Rewritten to be IDEMPOTENT. The older migrations in this directory were
-- generated for SQLite and cannot run against Postgres, so schema repair also
-- happens at boot via utils/ensureSchema.js. Without IF NOT EXISTS the two
-- mechanisms would fight: the parachute would create the table, then this
-- migration would fail on "already exists". Either can now run first.

CREATE TABLE IF NOT EXISTS "AssistantSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
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
);

CREATE TABLE IF NOT EXISTS "AssistantMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AssistantSession_userId_updatedAt_idx" ON "AssistantSession"("userId", "updatedAt");
CREATE INDEX IF NOT EXISTS "AssistantSession_draftId_idx" ON "AssistantSession"("draftId");
CREATE INDEX IF NOT EXISTS "AssistantMessage_sessionId_createdAt_idx" ON "AssistantMessage"("sessionId", "createdAt");

-- ADD CONSTRAINT has no IF NOT EXISTS, so guard it.
DO $$ BEGIN
    ALTER TABLE "AssistantMessage"
        ADD CONSTRAINT "AssistantMessage_sessionId_fkey"
        FOREIGN KEY ("sessionId") REFERENCES "AssistantSession"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
