-- Idempotent 3-state rating migration. The schema-diff CI never applies
-- migrations to a real DB, so this must tolerate whatever state prod is in: the
-- `rating` enum may already exist (0000) and the column may already be the enum
-- rather than the 0001 integer pivot.
DO $$ BEGIN
  CREATE TYPE "public"."rating" AS ENUM('loved', 'fine', 'disliked');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
-- Convert the 0001 integer pivot to the 3-state enum (>=4 loved, 3 fine, <=2
-- disliked). If the column is already the enum, `rating >= 4` has no operator
-- (undefined_function / 42883) and there is nothing to convert -- swallow it so
-- a re-run against an already-migrated DB is a no-op.
DO $$ BEGIN
  ALTER TABLE "beer_ratings" ALTER COLUMN "rating" SET DATA TYPE "public"."rating"
    USING (CASE WHEN "rating" >= 4 THEN 'loved' WHEN "rating" = 3 THEN 'fine' ELSE 'disliked' END)::"public"."rating";
EXCEPTION WHEN undefined_function THEN null;
END $$;
