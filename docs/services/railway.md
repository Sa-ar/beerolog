# Railway (API deployment)

## Create a service

1. [railway.app](https://railway.app) → New project → **Deploy from GitHub repo**
2. Select the `beerolog` repo
3. Railway will detect the repo root. You need to set the root directory:
   - Service settings → Source → **Root directory**: `apps/api`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Health check path: `/health`

## Environment variables

Service settings → Variables:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `OPENAI_API_KEY` | OpenAI secret key |
| `COGNITO_USER_POOL_ID` | e.g. `us-east-1_abc123` |
| `COGNITO_CLIENT_ID` | Cognito app client ID |
| `COGNITO_REGION` | e.g. `us-east-1` |
| `API_SECRET` | **A random secret — do not use the default** |

> **Security**: `API_SECRET` defaults to `dev-secret` in code. This value is used to sign QR tokens and friend-challenge tokens. Set it to a strong random string before going live: `openssl rand -hex 32`.

## Deploy

Railway auto-deploys on every push to the configured branch (`main` by default). To trigger a manual deploy: Service → Deployments → **Deploy**.

## Get the API URL

After first deploy: Service → Settings → **Public networking** → Generate domain.
Copy the URL and set it as `VITE_API_URL` in the Vercel environment variables.
