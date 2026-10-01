-- Persist the public invite-request waitlist.
--
-- It previously lived in backend/data/inviteRequests.json. Railway's filesystem
-- is ephemeral, so every redeploy silently discarded the whole waitlist — and
-- the write raced between concurrent requests. A table fixes both.
--
-- Additive and idempotent, like the migrations before it: safe to re-run, and
-- it drops nothing.

CREATE TABLE IF NOT EXISTS "InviteRequest" (
    "id"           TEXT NOT NULL,
    "name"         TEXT,
    "email"        TEXT NOT NULL,
    "organization" TEXT,
    "reason"       TEXT,
    "tier"         TEXT,
    "status"       TEXT NOT NULL DEFAULT 'pending',
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteRequest_pkey" PRIMARY KEY ("id")
);

-- One row per address: a repeat submission updates the existing request instead
-- of queueing a duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS "InviteRequest_email_key"
    ON "InviteRequest"("email");

CREATE INDEX IF NOT EXISTS "InviteRequest_status_createdAt_idx"
    ON "InviteRequest"("status", "createdAt");
