DO $$ BEGIN
 CREATE TYPE "public"."catalog_gap_status" AS ENUM('pending', 'approved', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "catalog_gaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" text NOT NULL,
	"submitted_by" uuid,
	"name" text NOT NULL,
	"brewery" text,
	"style" text,
	"abv" real,
	"ibu" integer,
	"tasting_notes" text,
	"flavor_vector" real[],
	"status" "catalog_gap_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "catalog_gaps" ADD CONSTRAINT "catalog_gaps_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "catalog_gaps" ADD CONSTRAINT "catalog_gaps_submitted_by_staff_members_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."staff_members"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "catalog_gaps_status_idx" ON "catalog_gaps" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "catalog_gaps_venue_idx" ON "catalog_gaps" USING btree ("venue_id");