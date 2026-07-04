CREATE TYPE "public"."rating" AS ENUM('loved', 'fine', 'disliked');--> statement-breakpoint
-- Reverses the 0001 integer pivot. Existing 1-5 rows are mapped onto the
-- 3-state enum so the cast is non-destructive (>=4 loved, 3 fine, <=2 disliked).
ALTER TABLE "beer_ratings" ALTER COLUMN "rating" SET DATA TYPE rating
  USING (CASE WHEN "rating" >= 4 THEN 'loved' WHEN "rating" = 3 THEN 'fine' ELSE 'disliked' END)::"public"."rating";