# OpenAI

## Create an API key

1. [platform.openai.com](https://platform.openai.com) → API keys → **Create new secret key**
2. Name: `beerolog`
3. Copy the key immediately (shown once)

Set it as `OPENAI_API_KEY` in `apps/api/.env`.

## Models used

| Use case | Model |
|---|---|
| Beer embeddings (stored in `beers.embedding`) | `text-embedding-3-small` (1536 dims) |
| User profile embeddings (stored in `user_profiles.embedding`) | `text-embedding-3-small` (1536 dims) |
| Menu image scanning — extract beer names from a photo (deferred venue/scan surface) | `gpt-4o` |
| Taste profile icons (GPT SVG, stored in `icons`) | `gpt-4o-mini` |
| Recommendation explanations — one sentence per beer | `gpt-4o` |

## Usage notes

- Embeddings are generated when beers are added to the catalog or when user profiles are first created/migrated
- GPT-4o calls happen at request time for recommendation explanations; menu scanning remains documented here as deferred venue/scan work.
- No streaming is used
