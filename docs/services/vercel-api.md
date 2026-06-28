# Vercel (API deployment)

The Beerolog FastAPI app runs as a **second Vercel project** (`beerolog-api`) in the same team as the web app. This keeps frontend and backend on one vendor while respecting the monorepo layout (`apps/api` + `packages/icon-service`).

## Create / link a project

1. [vercel.com](https://vercel.com) → Add new project → Import `beerolog` from GitHub
2. **Project name**: `beerolog-api`
3. **Root directory**: `apps/api`
4. **Framework preset**: Other (`framework: null` in `apps/api/vercel.json`)

Link locally from the repo root (uses `apps/api/.vercel/`):

```bash
cd apps/api && vercel link
```

Deploy production from the **monorepo root** so `packages/icon-service` is available to `uv`:

```bash
cd /path/to/beerolog
VERCEL_ORG_ID=<team_id> VERCEL_PROJECT_ID=<beerolog-api_project_id> vercel deploy --prod
```

Git pushes to `main` also deploy when the GitHub integration is connected.

## How the deploy works

| Piece | Purpose |
|---|---|
| `apps/api/vercel.json` | `uv sync` from repo root, noop build, `public/` output (Turbo monorepo), rewrite all routes to `/api` |
| `apps/api/api/index.py` | Vercel Python entrypoint — imports `app` from `app.main` |
| `apps/api/pyproject.toml` `[tool.vercel]` | Documents the FastAPI entrypoint (`app.main:app`) |
| `apps/api/public/` | Empty static output dir (required when Turbo is detected at repo root) |

**Monorepo note:** Turbo detection at the repo root would fail builds without an explicit `outputDirectory`. The `public/` folder satisfies that check. The Python function is built separately from `api/index.py` and uses the full uploaded tree (including `packages/icon-service`).

## Environment variables

Set in the `beerolog-api` project for **Production** (and Preview if needed):

| Variable | Example / notes |
|---|---|
| `APP_ENV` | `production` |
| `DATABASE_URL` | Neon pooled Postgres URL |
| `OPENAI_API_KEY` | OpenAI secret key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `API_SECRET` | `openssl rand -hex 32` — must not be `dev-secret` |
| `CORS_ALLOWED_ORIGINS` | `https://beerolog.vercel.app,http://localhost:3000` (comma-separated) |
| `LOG_LEVEL` | `INFO` (optional) |

Startup checks in `app/startup_checks.py` **fail fast** in production if secrets are missing, `API_SECRET` is still the dev default, or CORS origins are empty/invalid.

## Wire web → API

On the **web** project (`beerolog`):

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://beerolog-api.vercel.app` |

Redeploy web after changing `VITE_*` variables so the client bundle picks up the API URL.

## Verify

```bash
curl https://beerolog-api.vercel.app/health
curl https://beerolog-api.vercel.app/health/ready
```

`/health/ready` should report `database` and `embedding_provider` as `ok` when env vars are correct.

## Local development

Unchanged — run the API with `pnpm dev:api` or `uvicorn` from `apps/api`. Vercel config only affects deployed environments.

## Rate limiting (guest endpoint)

`POST /guest-recommendations` is public and unauthenticated and makes a paid
OpenAI embed call on a cache miss. The per-worker `_RateBudget` caps in the
handler are app-level defense-in-depth; the real per-IP bound is a **Vercel WAF
rate-limit rule** on the `beerolog-api` project — counted at the edge, before the
function, and coordinated across serverless instances.

Canonical rule (apply in the dashboard: project `beerolog-api` → **Firewall** →
**Configure** → **+ New Rule**):

| Field | Value |
|---|---|
| If — Request Path | `equals` `/guest-recommendations` |
| If — Request Method | `equals` `POST` |
| Then | **Rate Limit** |
| Strategy | Fixed Window (all plans) |
| Time Window | `60s` |
| Request Limit | `30` |
| Keys | `IP` |
| Action | **Default** (returns `429` on exceed) |

Then **Review Changes → Publish** (applies to production).

Notes:

- **Match the client path, not the rewrite.** The WAF evaluates the *incoming*
  request, so match `/guest-recommendations`. `apps/api/vercel.json` rewrites
  `/(.*) → /api` only *after* the firewall — do not match `/api`.
- **Action.** **Default** returns `429` on exceed (what we want). **Deny** is a
  harder `403` block; **Log** counts without blocking — start with **Log** for a
  day to watch real traffic, then switch to **Default**.
- Match `POST` only so CORS `OPTIONS` preflights aren't counted.
- Counters are tracked **per region** (per edge PoP). A single client IP normally
  hits one region, so its real cap is ~`30/min`; the per-region multiplier only
  bites for traffic spread across regions (e.g. a botnet). Lower the limit if
  needed.
- **Publish applies to production.** If Preview/PR API deploys need the same
  bound, configure it on those too (firewall config is per project/environment).
- **Verify after publishing:** 31 rapid POSTs from one IP inside 60s — the 31st
  should return `429`.
- Hobby allows 1 rate-limit rule per project; Pro allows 40.

## Related

- [vercel.md](vercel.md) — web (TanStack Start) deployment
- [neon.md](neon.md) — database
- [clerk.md](clerk.md) — auth origins
- [../ops/environment-matrix.md](../ops/environment-matrix.md) — full env contract
