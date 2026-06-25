# Beerolog

Beer recommendation and social expert app. Take a short quiz, get three beers matched to your taste profile. Rate what you drink to evolve your profile over time.

## Architecture

```mermaid
graph TD
  Browser([Browser])
  Vercel[Vercel — web app<br/>TanStack Start / React]
  Api[Vercel — API<br/>Python FastAPI]
  Neon[(Neon PostgreSQL)]
  Clerk[Clerk<br/>Auth]
  OpenAI[OpenAI<br/>Recommendation explanations]

  Browser --> Vercel
  Vercel --> Api
  Api --> Neon
  Vercel --> Clerk
  Api --> Clerk
  Api --> OpenAI
```

## Monorepo layout

| Directory | Purpose |
|---|---|
| `apps/web` | TanStack Start (React + Vinxi) frontend, deployed on Vercel |
| `apps/api` | FastAPI backend, deployed on Vercel (separate `beerolog-api` project) |
| `packages/types` | Shared TypeScript types and FlavorVector contract |
| `packages/db` | Drizzle ORM schema + migrations (Neon PostgreSQL) |
| `packages/ui` | Shared React component library |

## Prerequisites

- **Node** 20+
- **pnpm** 11+ (`npm i -g pnpm`)
- **Python** 3.12+

## Quick start

```bash
# 1. Install JS dependencies
pnpm install

# 2. Configure the API
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env and fill in the required values for DB, OpenAI, Clerk, and CORS

# 3. Configure the web app
cp apps/web/.env.local.example apps/web/.env.local
# Edit apps/web/.env.local — set VITE_API_URL=http://localhost:8000 for local dev

# 4. Set up the API Python environment
cd apps/api
uv sync --extra dev
cd ../..

# 5. Run migrations
pnpm db:migrate   # provisions the supported MVP persistence tables

# 6. Start everything
pnpm dev          # web app (http://localhost:3000)
# In a separate terminal:
cd apps/api && uv run uvicorn app.main:app --reload
```

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm test
```

## Supported MVP After Cleanup

- Canonical supported journey: signed-in, profile-centered solo flow
- Authoritative recommendation path: API `/recommendations`
- Deferred from the cleaned MVP: venue/scan flows, group sessions, friend challenges, leaderboards/social proof, badges, and broader bar tooling/operator workflows
- Launch/runtime config: API CORS, log level, and environment are configured via `APP_ENV`, `CORS_ALLOWED_ORIGINS`, and `LOG_LEVEL`

## Further reading

- [API setup](apps/api/README.md)
- [Web app setup](apps/web/README.md)
- [Architecture](docs/architecture.md)
- [Operational artifacts](docs/ops/README.md)
- [Clerk (authentication)](docs/services/clerk.md)
- [Neon PostgreSQL](docs/services/neon.md)
- [OpenAI](docs/services/openai.md)
- [Vercel (API deployment)](docs/services/vercel-api.md)
- [Vercel (web deployment)](docs/services/vercel.md)
