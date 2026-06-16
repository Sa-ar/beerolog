-- Pivot to the taste-profile matcher schema.
-- See docs/prds/taste-profile-matcher.md and docs/adr/0003-two-layer-taste-architecture.md.
-- This migration is destructive against the pre-pivot tables; the product has
-- no production users yet (per CONTEXT.md), so a drop-create is acceptable.

CREATE EXTENSION IF NOT EXISTS vector;

-- --------------------------------------------------------------------------
-- Drop old direction tables/enums
-- --------------------------------------------------------------------------

DROP TABLE IF EXISTS "user_style_suppressions";
DROP TABLE IF EXISTS "beer_ratings";
DROP TABLE IF EXISTS "user_profiles";

DROP TYPE IF EXISTS "rating";
DROP TYPE IF EXISTS "beer_style";

-- --------------------------------------------------------------------------
-- New enums
-- --------------------------------------------------------------------------

CREATE TYPE "market_tier" AS ENUM ('mainstream', 'craft', 'import');
CREATE TYPE "beer_color" AS ENUM ('pale', 'gold', 'amber', 'brown', 'dark');
CREATE TYPE "beer_body" AS ENUM ('light', 'medium', 'full');
CREATE TYPE "beer_sweetness" AS ENUM ('dry', 'balanced', 'sweet');
CREATE TYPE "notes_lang" AS ENUM ('he', 'en');
CREATE TYPE "notes_source" AS ENUM ('brewery', 'aggregator', 'synthetic');

-- --------------------------------------------------------------------------
-- BaselineTaste
-- --------------------------------------------------------------------------

CREATE TABLE "user_baseline_taste" (
  "user_id" text PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "bubbles" real NOT NULL,
  "bitterness" real NOT NULL,
  "flavor_family" jsonb NOT NULL,
  "novelty_affinity" real NOT NULL,
  "embedding" vector(1536) NOT NULL,
  "embedding_fresh_at" timestamptz NOT NULL DEFAULT NOW(),
  "updated_at" timestamptz NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- Beers (catalog)
-- --------------------------------------------------------------------------

CREATE TABLE "beers" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "name_hebrew" text,
  "brewery" text NOT NULL,
  "brewery_country" text NOT NULL,
  "style" text NOT NULL,
  "abv" real NOT NULL,
  "ibu" integer,
  "hops" text[],
  "malts" text[],
  "yeast" text,
  "color" "beer_color" NOT NULL,
  "body" "beer_body",
  "sweetness" "beer_sweetness",
  "market_tier" "market_tier" NOT NULL,
  "tasting_notes" text NOT NULL,
  "tasting_notes_lang" "notes_lang" NOT NULL,
  "notes_source" "notes_source" NOT NULL,
  "adventurousness" real NOT NULL,
  "embedding" vector(1536) NOT NULL,
  "image_url" text,
  "source_url" text,
  "seeded_at" timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX "beers_market_tier_idx" ON "beers" ("market_tier");
CREATE INDEX "beers_style_idx" ON "beers" ("style");
CREATE INDEX "beers_embedding_cosine_idx" ON "beers" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

-- --------------------------------------------------------------------------
-- Ratings (integer 1–5)
-- --------------------------------------------------------------------------

CREATE TABLE "beer_ratings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "beer_id" text NOT NULL REFERENCES "beers"("id") ON DELETE CASCADE,
  "rating" integer NOT NULL CHECK ("rating" BETWEEN 1 AND 5),
  "note" text,
  "created_at" timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX "beer_ratings_user_idx" ON "beer_ratings" ("user_id");
CREATE INDEX "beer_ratings_beer_idx" ON "beer_ratings" ("beer_id");
CREATE UNIQUE INDEX "beer_ratings_user_beer_uniq" ON "beer_ratings" ("user_id", "beer_id");
