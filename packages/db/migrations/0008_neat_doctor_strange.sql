-- Idempotent enum extension (#219): prod may already have 'unknown' since the
-- schema-diff CI never applies migrations. IF NOT EXISTS makes a re-run a no-op.
ALTER TYPE "public"."rating" ADD VALUE IF NOT EXISTS 'unknown';