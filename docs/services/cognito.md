
> **Status: Historical reference only.** Cognito is no longer Beerolog's launch auth provider. See ADR 0002 (`docs/adr/0002-clerk-social-first-auth.md`) and `docs/services/clerk.md` for the current auth setup.

# AWS Cognito

## Create a user pool

1. AWS Console → Cognito → **Create user pool**
2. Sign-in options: **Email**
3. Password policy: defaults are fine
4. MFA: **No MFA** (or optional)
5. User account recovery: Email
6. Required attributes: `email`
7. Email provider: **Send email with Cognito** (free tier, sufficient for dev)
8. User pool name: `beerolog`
9. Hosted UI: **Enable**
10. Domain: choose a Cognito domain prefix, e.g. `beerolog-auth` → domain becomes `https://beerolog-auth.auth.us-east-1.amazoncognito.com`
11. App type: **Single-page application (SPA)**
12. App client name: `beerolog-web`
13. Callback URLs: `http://localhost:3000/auth/callback` (add each Vercel URL you intentionally support when deploying)
14. Sign-out URLs: `http://localhost:3000` (and the matching deployed app origins)
15. OAuth scopes: `openid`, `email`, `profile`
16. **Create user pool**

## What to note down

After creation, collect these values:

| Value | Where to find it |
|---|---|
| User pool ID | User pool overview page, e.g. `us-east-1_abc123` |
| App client ID | App clients tab, **not** the client secret |
| Cognito domain | App integration tab → Domain |
| Region | The AWS region you created the pool in |

## Env vars

**API** (`apps/api/.env`):

| Variable | Value |
|---|---|
| `COGNITO_USER_POOL_ID` | User pool ID (e.g. `us-east-1_abc123`) |
| `COGNITO_CLIENT_ID` | App client ID |
| `COGNITO_REGION` | Region (e.g. `us-east-1`) |

**Web** (`apps/web/.env.local`):

| Variable | Value |
|---|---|
| `VITE_COGNITO_DOMAIN` | Full hosted UI domain URL |
| `VITE_COGNITO_CLIENT_ID` | App client ID (same value as API) |

## Adding a production callback URL

When the Vercel deployment URL is known:

1. Cognito → User pool → App clients → Edit
2. Add `https://your-app.vercel.app/auth/callback` to **Allowed callback URLs**
3. Add `https://your-app.vercel.app` to **Allowed sign-out URLs**
4. Save
