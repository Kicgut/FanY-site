-- The preceding migration copied legacy Portfolio scalars into normalized records.
-- Remove the obsolete columns so runtime code cannot accidentally depend on them.
ALTER TABLE "Portfolio" DROP COLUMN "content";
ALTER TABLE "Portfolio" DROP COLUMN "coverImage";
ALTER TABLE "Portfolio" DROP COLUMN "images";
ALTER TABLE "Portfolio" DROP COLUMN "link";
