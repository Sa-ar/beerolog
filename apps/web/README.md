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
| `VITE_API_URL` | yes | API base URL. Local: `http://localhost:8000`. Prod: Railway URL. |
| `VITE_COGNITO_DOMAIN` | yes | Cognito hosted UI domain (e.g. `https://beerolog.auth.us-east-1.amazoncognito.com`) |
| `VITE_COGNITO_CLIENT_ID` | yes | Cognito app client ID |

For local development, set `VITE_API_URL=http://localhost:8000` and configure the Cognito variables if you want to exercise the supported signed-in solo flow locally.

## Deployment

See [docs/services/vercel.md](../../docs/services/vercel.md) for Vercel project configuration.

## Routes

| Path | Description |
|---|---|
| `/` | Home / landing |
| `/quiz` | Flavor quiz |
| `/results` | Recommendation results |
| `/profile` | User taste profile + persona |
| `/signin` | Cognito sign-in redirect |
| `/auth/callback` | Cognito OAuth callback |

Venue/scan and group/challenge routes are intentionally deferred from the supported MVP and are not mounted in the current app router.
