CREATE TABLE IF NOT EXISTS "guest_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"answers" jsonb NOT NULL,
	"shown_beer_ids" text[] NOT NULL,
	"source" text DEFAULT 'free' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
