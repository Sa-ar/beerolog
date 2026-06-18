# Railway (API deployment)

## Create a service

1. [railway.app](https://railway.app) → New project → **Deploy from GitHub repo**
2. Select the `beerolog` repo
3. **Root directory**: leave blank (repo root). The API lives in `apps/api`, but it depends on the local package `packages/icon-service`; narrowing the root to `apps/api` breaks the build.
4. Build and start commands are defined in root `railway.toml`:
   - Build: `uv sync --frozen --no-dev --directory apps/api`
   - Start: `uv --directory apps/api run uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Health check path: `/health`

## Environment variables

Service settings → Variables:

| Variable | Value |
|---|---|
| `APP_ENV` | `production` |
| `DATABASE_URL` | Neon pooled connection string |
| `OPENAI_API_KEY` | OpenAI secret key |
| `CLERK_SECRET_KEY` | Clerk secret key for this environment (e.g. `sk_live_...`) |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key (used to derive the JWKS URL for token verification) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated Vercel origins allowed to call the API |
| `LOG_LEVEL` | `INFO` (or `DEBUG` temporarily while debugging) |
| `API_SECRET` | **A random secret — do not use the default** |

> **Security**: `API_SECRET` defaults to `dev-secret` in code. This value is used to sign QR tokens and friend-challenge tokens. Set it to a strong random string before going live: `openssl rand -hex 32`.

## Deploy

Railway auto-deploys on every push to the configured branch (`main` by default). To trigger a manual deploy: Service → Deployments → **Deploy**.

## Get the API URL

After first deploy: Service → Settings → **Public networking** → Generate domain.
Copy the URL and set it as `VITE_API_URL` in the Vercel environment variables.

## Runtime checklist

1. Run `pnpm db:migrate` against the same `DATABASE_URL` before expecting the signed-in solo flow to work.
2. Set `CORS_ALLOWED_ORIGINS` to the exact Vercel origin(s) that should call the API.
3. Verify `/health` returns `200` after deploy.
4. Use the `X-Request-ID` response header to correlate client failures with Railway logs.

## Observability

- Request logs include method, path, status code, duration, and request ID.
- Unhandled `500` responses return a JSON body with `request_id` so the error can be traced in logs.
