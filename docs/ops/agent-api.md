# Agent API runbook

How external agents connect to Beerolog. Design rationale: ADR-0007.

## Surfaces

| Surface | Path | Auth | Notes |
|---|---|---|---|
| Public REST | `GET /catalog`, `GET /catalog/{id}`, `GET /catalog/search`, `POST /catalog/recommend` | none | Read-only; embeddings stripped |
| OpenAPI | `openapi.json` (via `pnpm openapi:export`) | none | Generated from the same routes |
| MCP | `/mcp` (streamable-HTTP, stateless) | bearer for user tools | Tools shim the REST routes |
| schema.org | `/try` page JSON-LD | none | `ItemList` of `Product` |

## MCP tools

- Public: `search_catalog`, `recommend_beers`, `get_beer`
- User-scoped (need a Clerk session JWT as `Authorization: Bearer <token>` on the
  MCP request): `submit_rating`, `list_my_ratings`, `get_taste_profile`

## Local dev

```sh
pnpm dev:api                     # serves the app incl. /catalog and /mcp
# REST
curl "http://127.0.0.1:$API_PORT/catalog/search?style=ipa&max_abv=6"
curl -X POST "http://127.0.0.1:$API_PORT/catalog/recommend" \
  -H 'content-type: application/json' \
  -d '{"preference_text":"hoppy Israeli craft beer under 6% ABV","limit":5}'
# MCP (interactive inspector)
npx @modelcontextprotocol/inspector "http://127.0.0.1:$API_PORT/mcp"
```

`recommend` and `recommend_beers` require `OPENAI_API_KEY` (they embed the
query); the other read tools do not. User-scoped tools require
`CLERK_PUBLISHABLE_KEY` configured server-side and a valid session token from a
signed-in user.

## Deploy notes

- MCP runs in the FastAPI process in stateless streamable-HTTP mode, so it works
  on Vercel Functions. A stateful/session MCP mode would need a long-running
  host (deferred — ADR-0007).
