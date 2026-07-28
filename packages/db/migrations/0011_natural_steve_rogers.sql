-- Idempotent catch-beers proof columns migration. The schema-diff CI never
-- applies migrations to a real DB, so this must tolerate a prod DB where the
-- enum and/or columns may already exist from a prior partial apply.
DO $$ BEGIN
  CREATE TYPE "public"."proof_source" AS ENUM('self_photo', 'venue_verified');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "beer_ratings" ADD COLUMN IF NOT EXISTS "proof_photo_url" text;--> statement-breakpoint
ALTER TABLE "beer_ratings" ADD COLUMN IF NOT EXISTS "proof_source" "proof_source";
