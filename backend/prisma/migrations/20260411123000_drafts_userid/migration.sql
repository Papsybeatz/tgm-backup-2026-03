-- Migration: drafts_userid
-- Add userId FK to Draft, backfill from User.email, drop userEmail
PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- Create new Draft table with userId relation
CREATE TABLE "Draft_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "tierAtCreation" TEXT NOT NULL,
    CONSTRAINT "Draft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Backfill userId from existing userEmail
INSERT INTO "Draft_new" ("id","userId","title","content","createdAt","updatedAt","tierAtCreation")
SELECT
  "Draft"."id",
  (SELECT "User"."id" FROM "User" WHERE "User"."email" = "Draft"."userEmail" LIMIT 1) AS userId,
  "Draft"."title",
  "Draft"."content",
  "Draft"."createdAt",
  "Draft"."updatedAt",
  "Draft"."tierAtCreation"
FROM "Draft";

-- Drop old Draft table
DROP TABLE "Draft";

-- Rename new table
ALTER TABLE "Draft_new" RENAME TO "Draft";

COMMIT;
PRAGMA foreign_keys = ON;
