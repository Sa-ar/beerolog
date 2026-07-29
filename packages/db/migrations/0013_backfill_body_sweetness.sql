-- #274: backfill body/sweetness for existing catalog rows from style, so the
-- detail chips render for every beer instead of ~11%. Mirrors deriveBody /
-- deriveSweetness in scripts/seed_catalog/normalise_row.ts. Column-only — it
-- does NOT touch stored embeddings (a future re-seed re-embeds separately).
-- Idempotent: only fills rows where the value is still NULL.
UPDATE "beers" SET "body" = CASE
  WHEN "style" ~* 'imperial stout|russian imperial|barleywine|barley wine|old ale|stout|porter' THEN 'full'
  WHEN "style" ~* 'wheat|witbier|hefe|weiss|gose|sour|lambic|berliner|pilsner|lager|blonde|golden|kölsch|kolsch|helles|saison' THEN 'light'
  ELSE 'medium'
END::"public"."beer_body"
WHERE "body" IS NULL;
--> statement-breakpoint
UPDATE "beers" SET "sweetness" = CASE
  WHEN "style" ~* 'imperial stout|barleywine|barley wine|old ale|bock|dubbel|scotch' THEN 'sweet'
  WHEN "style" ~* 'ipa|india pale|pale ale|pilsner|lager|gose|sour|lambic|berliner|brut' THEN 'dry'
  ELSE 'balanced'
END::"public"."beer_sweetness"
WHERE "sweetness" IS NULL;
