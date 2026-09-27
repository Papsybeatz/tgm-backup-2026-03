-- Give a saved draft its order ticket so Checkmate can score it with the same
-- context Steve wrote it with. Idempotent: utils/ensureSchema.js may have
-- already added this column at boot.

ALTER TABLE "Draft" ADD COLUMN IF NOT EXISTS "order" JSONB;
