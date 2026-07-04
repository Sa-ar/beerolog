-- Idempotent 3-state rating migration. The schema-diff CI never applies
-- migrations to a real DB, so this must tolerate whatever state prod is in:
-- the `rating` enum may already exist (0000) and the column may already be the
-- enum rather than the 0001 integer pivot. Guard both steps so a re-run is a
-- no-op instead of erroring on `rating >= integer`.
DO $$ BEGIN
  CREATE TYPE "public"."rating" AS ENUM('loved', 'fine', 'disliked');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
-- Reverses the 0001 integer pivot only when the column is still integer;
-- maps existing 1-5 rows onto the 3-state enum (>=4 loved, 3 fine, <=2 disliked).
DO $$ BEGIN
  IF (
    SELECT data_type FROM information_schema.columns
    WHERE table_name = 'beer_ratings' AND column_name = 'rating'
  ) = 'integer' THEN
    ALTER TABLE "beer_ratings" ALTER COLUMN "rating" SET DATA TYPE rating
      USING (CASE WHEN "rating" >= 4 THEN 'loved' WHEN "rating" = 3 THEN 'fine' ELSE 'disliked' END)::"public"."rating";
  END IF;
END $$;
