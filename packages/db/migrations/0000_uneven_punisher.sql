CREATE TYPE "public"."beer_style" AS ENUM('lager', 'pilsner', 'kolsch', 'wheat', 'pale_ale', 'ipa', 'amber_ale', 'brown_ale', 'stout', 'porter', 'sour', 'saison', 'dunkel', 'vienna_lager', 'other');--> statement-breakpoint
CREATE TYPE "public"."rating" AS ENUM('loved', 'fine', 'disliked');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "beer_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"beer_id" text NOT NULL,
	"rating" "rating",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"flavor_vector" real[] NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_style_suppressions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"style" "beer_style" NOT NULL,
	"remaining_count" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "beer_ratings_user_idx" ON "beer_ratings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "beer_ratings_beer_idx" ON "beer_ratings" USING btree ("beer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_style_suppressions_user_idx" ON "user_style_suppressions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_style_suppressions_user_style_idx" ON "user_style_suppressions" USING btree ("user_id","style");