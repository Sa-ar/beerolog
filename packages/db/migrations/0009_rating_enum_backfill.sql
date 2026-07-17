-- Fix: on some DBs beer_ratings.rating never converted from the 0001 integer
-- column to the 3-state enum -- 0006's `EXCEPTION WHEN undefined_function` guard
-- swallowed the ALTER, leaving `rating integer`. Enum-string inserts from
-- POST /rate/session then failed (invalid input syntax for type integer) and
-- nothing saved. Convert idempotently by checking the actual column type at
-- runtime instead of catching an exception.
DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_name = 'beer_ratings' AND column_name = 'rating') = 'integer' THEN
    ALTER TABLE "beer_ratings" DROP CONSTRAINT IF EXISTS "beer_ratings_rating_check";
    ALTER TABLE "beer_ratings" ALTER COLUMN "rating" SET DATA TYPE "public"."rating"
      USING (CASE WHEN "rating" >= 4 THEN 'loved' WHEN "rating" = 3 THEN 'fine' ELSE 'disliked' END)::"public"."rating";
  END IF;
END $$;
