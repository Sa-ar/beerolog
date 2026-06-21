ALTER TABLE "user_baseline_taste" ADD COLUMN "sweetness" real DEFAULT 0.5 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_baseline_taste" ADD COLUMN "body" real DEFAULT 0.5 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_baseline_taste" ADD COLUMN "abv_affinity" real DEFAULT 0.5 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_baseline_taste" ADD COLUMN "model_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_baseline_taste" ADD COLUMN "persona_title_en" text;--> statement-breakpoint
ALTER TABLE "user_baseline_taste" ADD COLUMN "persona_title_he" text;--> statement-breakpoint
ALTER TABLE "user_baseline_taste" ADD COLUMN "persona_blurb_en" text;--> statement-breakpoint
ALTER TABLE "user_baseline_taste" ADD COLUMN "persona_blurb_he" text;
