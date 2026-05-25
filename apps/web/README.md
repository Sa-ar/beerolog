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

## Typecheck

```bash
pnpm typecheck
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | yes | API base URL. Local: `http://localhost:8000`. Prod: Railway URL. |
| `VITE_COGNITO_DOMAIN` | yes | Cognito hosted UI domain (e.g. `https://beerolog.auth.us-east-1.amazoncognito.com`) |
| `VITE_COGNITO_CLIENT_ID` | yes | Cognito app client ID |

For local development, `VITE_API_URL=http://localhost:8000` is sufficient to work without Cognito — unauthenticated flows (quiz, recommendations, group sessions as guest) will still work.

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
| `/venues/:venueId/tap-list` | Venue tap list view |
| `/venues/:venueId/manage` | Venue management (tap list editor) |
| `/venues/:venueId/leaderboard` | Venue recommendation leaderboard |
| `/scan/:token` | QR code resolver |
| `/group` | Start a group session |
| `/group/:sessionId` | Join / participate in group session |
| `/group/:sessionId/result` | Group recommendation result |
| `/challenge/:token` | Friend taste challenge |
