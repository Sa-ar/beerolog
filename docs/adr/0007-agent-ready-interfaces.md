# Agent-ready interfaces (MCP + public REST + schema.org)

- Status: Accepted
- Date: 2026-07-04

## Context

We want external AI agents to *use* Beerolog: search the catalog, get taste
recommendations, and (when authenticated) rate beers / read a taste profile.

We evaluated running [Microsoft NLWeb](https://github.com/microsoft/NLWeb) and
rejected it: NLWeb stands up a second vector store and re-embeds the catalog,
duplicating the retrieval engine Beerolog already has (`match_engine.rank`,
`fetch_catalog`, OpenAI embeddings) with no added capability for our use case.

## Decision

Expose the **existing** engine through the interfaces agents actually consume,
as additive surfaces over current code — no new datastore.

- **Public REST (`/catalog*`).** `GET /catalog`, `GET /catalog/{id}`,
  `GET /catalog/search`, `POST /catalog/recommend`. Unauthenticated, read-only,
  embeddings stripped. `recommend` fills a real gap: a free-text preference →
  ranked beers path the authed matcher never had (it takes structured dials).
  These flow through the existing `export_openapi.py` → `openapi.json` → web
  api-client pipeline, so agents can also consume the OpenAPI spec directly.
- **MCP server (`/mcp`).** A `FastMCP` app mounted into the FastAPI process,
  running **stateless streamable-HTTP** (Vercel Functions has no long-running
  host). Its six tools are a thin protocol shim: each forwards to the REST
  routes above via an in-process ASGI transport, so no business logic is
  duplicated. User-scoped tools (`submit_rating`, `list_my_ratings`,
  `get_taste_profile`) forward the caller's `Authorization` header, validated by
  the existing Clerk auth dependency — agents authenticate as a user with a
  Clerk session token.
- **schema.org JSON-LD.** An `ItemList` of `Product` (schema.org has no Beer
  type) rendered on the public `/try` results page so LLM browsers read the
  catalog as structured data.

Shared query helpers (`services/catalog_query.py`) back the REST routes; the MCP
tools back onto those same routes. One implementation, three surfaces.

## Consequences

- Agents get catalog + recommendation access with zero user state, and full
  rate/profile access with a Clerk token — reusing the exact auth and feedback
  pipeline the app already runs.
- The MCP server is bound to the app process and its stateless mode; a
  long-running/session MCP mode would need a separate host (deferred, see below).
- Deferred: a dedicated crawlable public `/catalog` web page + richer SEO
  (the `/try` list is quiz-gated from bare crawlers); AWS-hosted MCP; Beerolog
  acting as an MCP *client* to other services.
- Rejected: running the NLWeb server (duplicative vector store).
