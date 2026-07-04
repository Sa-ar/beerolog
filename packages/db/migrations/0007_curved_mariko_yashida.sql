CREATE TYPE "public"."availability_kind" AS ENUM('scrape_seen', 'scrape_absent', 'user_confirm', 'user_deny', 'user_add');--> statement-breakpoint
CREATE TYPE "public"."availability_source" AS ENUM('curated', 'user');--> statement-breakpoint
CREATE TYPE "public"."venue_type" AS ENUM('shop', 'pub');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "availability_confidence" (
	"beer_id" text NOT NULL,
	"venue_id" text NOT NULL,
	"confidence" real NOT NULL,
	"last_confirmed_at" timestamp with time zone,
	"recomputed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "availability_confidence_beer_id_venue_id_pk" PRIMARY KEY("beer_id","venue_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "availability_flag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"beer_id" text NOT NULL,
	"venue_id" text NOT NULL,
	"reporter" text NOT NULL,
	"reason" text,
	"resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "availability_match_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" text NOT NULL,
	"beer_id" text NOT NULL,
	"score" real NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "availability_signal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"beer_id" text NOT NULL,
	"venue_id" text NOT NULL,
	"kind" "availability_kind" NOT NULL,
	"weight" real NOT NULL,
	"actor" text NOT NULL,
	"source_url" text,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "beer_availability" (
	"beer_id" text NOT NULL,
	"venue_id" text NOT NULL,
	"source" "availability_source" DEFAULT 'curated' NOT NULL,
	"last_verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beer_availability_beer_id_venue_id_pk" PRIMARY KEY("beer_id","venue_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venues" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_hebrew" text,
	"type" "venue_type" NOT NULL,
	"city" text NOT NULL,
	"area" text,
	"address" text,
	"url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "availability_confidence" ADD CONSTRAINT "availability_confidence_beer_id_beers_id_fk" FOREIGN KEY ("beer_id") REFERENCES "public"."beers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "availability_confidence" ADD CONSTRAINT "availability_confidence_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "availability_flag" ADD CONSTRAINT "availability_flag_beer_id_beers_id_fk" FOREIGN KEY ("beer_id") REFERENCES "public"."beers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "availability_flag" ADD CONSTRAINT "availability_flag_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "availability_match_review" ADD CONSTRAINT "availability_match_review_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "availability_match_review" ADD CONSTRAINT "availability_match_review_beer_id_beers_id_fk" FOREIGN KEY ("beer_id") REFERENCES "public"."beers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "availability_signal" ADD CONSTRAINT "availability_signal_beer_id_beers_id_fk" FOREIGN KEY ("beer_id") REFERENCES "public"."beers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "availability_signal" ADD CONSTRAINT "availability_signal_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "beer_availability" ADD CONSTRAINT "beer_availability_beer_id_beers_id_fk" FOREIGN KEY ("beer_id") REFERENCES "public"."beers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "beer_availability" ADD CONSTRAINT "beer_availability_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "availability_confidence_beer_idx" ON "availability_confidence" USING btree ("beer_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "availability_flag_pair_reporter_uniq" ON "availability_flag" USING btree ("beer_id","venue_id","reporter");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "availability_match_review_open_idx" ON "availability_match_review" USING btree ("resolved");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "availability_signal_pair_idx" ON "availability_signal" USING btree ("beer_id","venue_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "beer_availability_beer_idx" ON "beer_availability" USING btree ("beer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venues_city_idx" ON "venues" USING btree ("city");