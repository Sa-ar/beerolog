# Beerolog API

Python FastAPI backend. Handles recommendations and user profiles for the cleaned MVP. Venue/scan and group/challenge endpoints remain deferred future work and are not part of the supported API surface.

## Requirements

- Python 3.12+

## Setup

```bash
cd apps/api
uv sync --extra dev
cp .env.example .env
# Fill in .env — see env var table below
cd ../..
pnpm db:migrate
```

The API depends on the local workspace package `beerolog-icon-service` (`packages/icon-service`). If you see `ModuleNotFoundError: No module named 'beerolog_icon_service'`, run `uv sync --extra dev` from `apps/api` (or `pnpm sync:api` from the repo root).

## Running

From the repo root:

```bash
pnpm dev:api
```

Or from `apps/api`:

```bash
uv run uvicorn app.main:app --reload --port 8000
```

## Deferred surfaces

- Venue tap-list management, QR scan, and venue leaderboard routes are intentionally deferred from the supported MVP.
- Group sessions and friend challenge routes are also intentionally deferred from the supported MVP.
- The supporting modules remain in the repo as follow-on work, but they are not mounted in the current FastAPI app.

## Quality checks

```bash
uv run ruff check .
uv run ruff format --check .
uv run pytest tests/ -v
```

Tests still use in-memory overrides via FastAPI `dependency_overrides`, but the supported runtime now expects a real `DATABASE_URL`, `OPENAI_API_KEY`, and Clerk configuration for the signed-in solo flow.

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `APP_ENV` | no | `development` | Runtime environment for logging and production warnings (`development`, `preview`, `production`) |
| `DATABASE_URL` | yes | — | Neon PostgreSQL connection string for the supported runtime persistence layer |
| `OPENAI_API_KEY` | yes | — | OpenAI secret key for recommendation explanations |
| `CLERK_SECRET_KEY` | yes | — | Clerk secret key (`sk_test_...` for dev, `sk_live_...` for prod) |
| `CLERK_PUBLISHABLE_KEY` | yes | — | Clerk publishable key; used to derive the JWKS URL for bearer token verification |
| `CORS_ALLOWED_ORIGINS` | no | `http://localhost:3000` | Comma-separated browser origins allowed to call the API |
| `LOG_LEVEL` | no | `INFO` | Python log level for request logs and startup warnings |
| `API_SECRET` | no | `dev-secret` | HS256 secret for deferred QR and challenge tokens |

> **Production**: `API_SECRET` defaults to `dev-secret`. This **must** be set to a random secret in the `beerolog-api` Vercel project before going live. See [docs/services/vercel-api.md](../../docs/services/vercel-api.md).

## API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/recommendations` | Get beer recommendations for the signed-in user |
| `POST` | `/guest-recommendations` | Anonymous preview recommendations |
| `POST` | `/onboarding` | Submit the onboarding quiz; seeds the baseline taste |
| `GET` | `/me/baseline-taste` | Get the persisted baseline taste + persona |
| `POST` | `/ratings` | Rate a beer (loved / fine / disliked) |
| `GET` | `/me/ratings` | List my ratings (paginated) |
| `GET` | `/me/export` | Export my account data |

## Runtime operations

- `GET /health` is the deploy health check.
- Every API response includes `X-Request-ID`; unhandled `500` responses return the same `request_id` in JSON for support/debugging.
- Request logs include method, path, status code, duration, and request ID.
