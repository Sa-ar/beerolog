-- Idempotent: the enum may already exist in prod; the schema-diff CI never
-- applies migrations, so tolerate a re-run (see 0006).
DO $$ BEGIN
 CREATE TYPE "public"."want_to_try_state" AS ENUM('want', 'must_try');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "want_to_try" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"beer_id" text NOT NULL,
	"state" "want_to_try_state" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "want_to_try" ADD CONSTRAINT "want_to_try_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "want_to_try" ADD CONSTRAINT "want_to_try_beer_id_beers_id_fk" FOREIGN KEY ("beer_id") REFERENCES "public"."beers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "want_to_try_user_idx" ON "want_to_try" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "want_to_try_user_beer_uniq" ON "want_to_try" USING btree ("user_id","beer_id");