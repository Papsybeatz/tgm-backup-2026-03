-- Client-aware Steve: a consultant runs the concierge on behalf of a client.
--
-- AssistantSession.clientId scopes a conversation to one client (so switching
-- clients never carries a conversation across), and Draft.clientId files the
-- finished document under that client.
--
-- Both are nullable: every existing session and draft is simply unscoped.

ALTER TABLE "AssistantSession" ADD COLUMN "clientId" TEXT;
ALTER TABLE "Draft" ADD COLUMN "clientId" TEXT;

CREATE INDEX "AssistantSession_userId_clientId_idx" ON "AssistantSession"("userId", "clientId");
CREATE INDEX "Draft_clientId_idx" ON "Draft"("clientId");
