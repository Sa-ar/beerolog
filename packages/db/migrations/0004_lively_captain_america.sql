CREATE TABLE IF NOT EXISTS "guest_embedding_cache" (
	"prompt_hash" text PRIMARY KEY NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
