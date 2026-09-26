-- Steve — conversational grant concierge
-- AssistantSession holds the order ticket + delivery state.
-- AssistantMessage holds the conversation transcript.

CREATE TABLE "AssistantSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'intake',
    "order" JSONB NOT NULL,
    "draftId" TEXT,
    "docTitle" TEXT,
    "docHtml" TEXT,
    "style" TEXT NOT NULL DEFAULT 'full_proposal',
    "score" INTEGER,
    "scoreReport" JSONB,
    "lastIntent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssistantMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AssistantSession_userId_updatedAt_idx" ON "AssistantSession"("userId", "updatedAt");

CREATE INDEX "AssistantSession_draftId_idx" ON "AssistantSession"("draftId");

CREATE INDEX "AssistantMessage_sessionId_createdAt_idx" ON "AssistantMessage"("sessionId", "createdAt");

ALTER TABLE "AssistantMessage" ADD CONSTRAINT "AssistantMessage_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "AssistantSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
