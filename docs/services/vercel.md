# Vercel (web deployment)

## Create a project

1. [vercel.com](https://vercel.com) → Add new project → Import `beerolog` from GitHub
2. **Root directory**: `apps/web`
3. **Framework preset**: Other (Vinxi/TanStack Start is not a listed preset)
4. **Build command**: `pnpm build`
5. **Output directory**: leave blank (Vinxi handles this)
6. **Install command**: `pnpm install --frozen-lockfile`

## Environment variables

Project settings → Environment variables → add for **Production**, **Preview**, and **Development**:

| Variable | Value |
|---|---|
| `VITE_API_URL` | Railway API URL, e.g. `https://beerolog-api.up.railway.app` |
| `VITE_COGNITO_DOMAIN` | Cognito hosted UI domain URL |
| `VITE_COGNITO_CLIENT_ID` | Cognito app client ID |

## Deploy

Vercel auto-deploys on every push to `main`. Preview deployments are created for every PR.

## After first deploy

1. Copy the Vercel deployment URL (e.g. `https://beerolog.vercel.app`)
2. Add it to Cognito allowed callback URLs: `https://beerolog.vercel.app/auth/callback` (see [cognito.md](cognito.md))
3. Add it to Vercel `VITE_API_URL` if not already set
