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
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key for this environment (e.g. `pk_live_...`) |

## Deploy

Make sure the Railway API has `CORS_ALLOWED_ORIGINS` set to each Vercel origin you expect to use (production domain, and any preview domain you intentionally support).


Vercel auto-deploys on every push to `main`. Preview deployments are created for every PR.

## After first deploy

1. Copy the Vercel deployment URL (e.g. `https://beerolog.vercel.app`)
2. Add it to the Clerk dashboard → Domains → Allowed origins (see [clerk.md](clerk.md))
3. Add it to Railway `CORS_ALLOWED_ORIGINS` if not already set there
4. Add it to Vercel `VITE_API_URL` if not already set
