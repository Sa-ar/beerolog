# Clerk (authentication)

Clerk is Beerolog's authentication provider. See ADR 0002 and `docs/prds/clerk-social-auth-foundation.md` for the decision rationale and launch requirements.

## Create a Clerk application

1. [clerk.com](https://clerk.com) → Create application
2. Application name: `beerolog`
3. Sign-in options: select **Google**, **Apple**, **Facebook**, **Instagram** only — disable email/password
4. Clerk creates two instances automatically: **Development** and **Production**

## Development instance

Development instances use Clerk's shared OAuth credentials. No provider app registration is required for local development.

### What to note down

| Value | Where to find it |
|---|---|
| Publishable key | Clerk Dashboard → API Keys → Publishable key (starts with `pk_test_`) |
| Secret key | Clerk Dashboard → API Keys → Secret keys → Reveal (starts with `sk_test_`) |
| Frontend API URL | Clerk Dashboard → Domains → Frontend API (e.g. `https://your-slug.clerk.accounts.dev`) |

### Local env vars

**Web** (`apps/web/.env.local`):

| Variable | Value |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Development publishable key |

**API** (`apps/api/.env`):

| Variable | Value |
|---|---|
| `CLERK_SECRET_KEY` | Development secret key |
| `CLERK_PUBLISHABLE_KEY` | Development publishable key (used to derive JWKS URL) |

## Production instance

Production instances require real OAuth app credentials for each provider.

### Provider setup (required before production launch)

Each provider must be configured in the Clerk Dashboard → Configure → Social connections for the **production instance**:

| Provider | Where to create credentials |
|---|---|
| Google | [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth 2.0 Client ID |
| Apple | [Apple Developer](https://developer.apple.com) → Certificates, Identifiers & Profiles → Services ID + Key |
| Facebook | [Meta for Developers](https://developers.facebook.com) → My Apps → Create app → Consumer |
| Instagram | [Meta for Developers](https://developers.facebook.com) → My Apps → Create app → Consumer (Instagram Basic Display or Instagram Graph API) |

Clerk's dashboard guides for each provider walk through the exact steps. Keep two tabs open: one for the Clerk dashboard and one for the provider developer console.

### Domain setup

1. Clerk Dashboard → Domains → Add domain → enter your production domain (e.g. `beerolog.app`)
2. Follow the DNS verification steps Clerk provides
3. Add your Vercel production and preview origins to **Allowed origins** in the Clerk dashboard

### What to note down

| Value | Where to find it |
|---|---|
| Publishable key | API Keys → Publishable key (starts with `pk_live_`) |
| Secret key | API Keys → Secret keys → Reveal (starts with `sk_live_`) |
| Frontend API URL | Domains → Frontend API |

## API token verification

The FastAPI backend verifies Clerk session tokens via JWKS. The JWKS endpoint is derived from the Clerk frontend API URL:

```
https://<your-clerk-frontend-api>/.well-known/jwks.json
```

The `CLERK_PUBLISHABLE_KEY` encodes the frontend API domain. The API uses this to construct the JWKS URL at startup and validate bearer tokens on every protected request.

## Env var reference

| System | Variable | Required | Notes |
|---|---|---|---|
| Web | `VITE_CLERK_PUBLISHABLE_KEY` | yes | `pk_test_` for dev, `pk_live_` for prod |
| API | `CLERK_SECRET_KEY` | yes | `sk_test_` for dev, `sk_live_` for prod |
| API | `CLERK_PUBLISHABLE_KEY` | yes | Used to derive JWKS URL for token verification |

## After adding a new production deployment URL

When a new Vercel deployment URL is known:

1. Clerk Dashboard → Domains → Allowed origins → add the new URL
2. Update the `beerolog-api` Vercel project's `CORS_ALLOWED_ORIGINS` to include the same origin
3. Verify sign-in completes end-to-end from that origin
