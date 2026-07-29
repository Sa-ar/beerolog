DO $$ BEGIN
 CREATE TYPE "public"."rating_outcome" AS ENUM('as_expected', 'not_what_expected', 'better_than_expected');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "beer_ratings" ADD COLUMN IF NOT EXISTS "outcome" "rating_outcome";--> statement-breakpoint
ALTER TABLE "beer_ratings" ADD COLUMN IF NOT EXISTS "outcome_venue_id" text;--> statement-breakpoint
ALTER TABLE "beer_ratings" ADD COLUMN IF NOT EXISTS "order_id" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "beer_ratings" ADD CONSTRAINT "beer_ratings_outcome_venue_id_venues_id_fk" FOREIGN KEY ("outcome_venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
