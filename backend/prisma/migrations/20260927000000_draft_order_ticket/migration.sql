-- Give a saved draft its order ticket, so Checkmate can score it with the same
-- context Steve used to write it. Without this a saved draft could only be
-- scored by the old word-count heuristic.

ALTER TABLE "Draft" ADD COLUMN "order" JSONB;
