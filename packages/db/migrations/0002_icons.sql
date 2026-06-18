CREATE TABLE IF NOT EXISTS "icons" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "purpose" text NOT NULL,
  "description" text NOT NULL,
  "svg_content" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "icons_purpose_uniq" ON "icons" USING btree ("purpose");
