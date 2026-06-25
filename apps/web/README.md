# Beerolog Web

TanStack Start (React + Vinxi) frontend. Deployed on Vercel.

## Requirements

- Node 20+
- pnpm 11+

## Setup

```bash
# From the monorepo root:
pnpm install

cp .env.local.example .env.local
# Edit .env.local — see env var table below
```

## Running

```bash
# From the monorepo root:
pnpm dev
# Web app at http://localhost:3000

# Or from this directory:
pnpm dev
```

## Quality checks

```bash
pnpm typecheck
pnpm lint
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | yes | API base URL. Local: `http://localhost:8000`. Prod: the `beerolog-api` Vercel URL. |
| `VITE_CLERK_PUBLISHABLE_KEY` | yes | Clerk publishable key (e.g. `pk_test_...` for dev, `pk_live_...` for prod) |

For local development, set `VITE_API_URL=http://localhost:8000` and set `VITE_CLERK_PUBLISHABLE_KEY` to your Clerk development instance publishable key. See [docs/services/clerk.md](../../docs/services/clerk.md).

## Deployment

See [docs/services/vercel.md](../../docs/services/vercel.md) for Vercel project configuration.

## Routes

| Path | Description |
|---|---|
| `/` | Home / landing |
| `/menu` | Menu photo scan and beer confirmation |
| `/quiz` | Flavor quiz |
| `/results` | Recommendation results |
| `/profile` | User taste profile + persona |
| `/signin` | Clerk sign-in page |

Venue/scan and group/challenge routes are intentionally deferred from the supported MVP and are not mounted in the current app router.
