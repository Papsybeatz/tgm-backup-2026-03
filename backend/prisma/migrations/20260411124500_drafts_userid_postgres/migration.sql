-- Postgres migration: Add `userId` to Draft, backfill from `userEmail`, add FK, drop `userEmail`
-- WARNING: Backup your production DB before running this migration.

BEGIN;

-- 1) Add nullable userId column
ALTER TABLE "Draft" ADD COLUMN "userId" TEXT;

-- 2) Backfill userId from User.email
UPDATE "Draft" d
SET "userId" = u.id
FROM "User" u
WHERE u.email = d."userEmail";

-- Optional sanity check: show rows that could not be backfilled
-- SELECT id FROM "Draft" WHERE "userId" IS NULL LIMIT 10;

-- 3) If any rows are still null, decide how to handle them before proceeding.
--    You can either delete or assign to a placeholder user.

-- 4) Make userId NOT NULL (only if backfill succeeded for all rows)
ALTER TABLE "Draft" ALTER COLUMN "userId" SET NOT NULL;

-- 5) Add foreign key constraint referencing User(id)
ALTER TABLE "Draft"
  ADD CONSTRAINT "Draft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6) Drop old foreign key constraint on userEmail (if exists) and drop the column
ALTER TABLE "Draft" DROP CONSTRAINT IF EXISTS "Draft_userEmail_fkey";
ALTER TABLE "Draft" DROP COLUMN IF EXISTS "userEmail";

COMMIT;

-- End of migration
