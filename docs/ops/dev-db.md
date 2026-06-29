# Preview / development database

One shared Neon branch backs **all** preview deployments — not a branch per PR.
Simple, and it never hits the Neon branch quota. The trade-off: previews share
schema and data, so a migration on the shared branch is visible to every
preview at once (no per-PR isolation).

## Branches

| Neon branch | Used by |
|---|---|
| `production` | prod (DATABASE_URL = `PROD_DATABASE_URL`) |
| `preview` (shared) | every Vercel preview deploy |

(Plus `preview/staging` for the staging env and `vercel-dev` for local dev.)

## One-time setup

1. **Create the shared branch** in the Neon console (branch off `production`),
   named `preview`. Copy its **pooled** connection string.
2. **GitHub secret:** add `PREVIEW_DATABASE_URL` = that pooled string.
3. **Vercel** (both `beerolog` and `beerolog-api` projects): set a single
   **Preview**-scoped `DATABASE_URL` env var = the same pooled string. Not
   git-branch-scoped — one value for all previews.
4. **Disable the Neon–Vercel integration's per-preview branching** so it stops
   creating `preview/<branch>` branches: Vercel → team → Integrations → Neon
   (the one scoped to *All Projects*, `icfg_tjOM…`) → scope it off `beerolog`
   and `beerolog-api` (or disable preview branching). Production is unaffected
   — prod `DATABASE_URL` is a standalone secret, not integration-owned.

## Day-to-day

- After changing the schema / adding a migration, run the **Migrate dev DB**
  workflow (Actions tab → manual trigger). It applies pending Drizzle
  migrations to the shared branch.
- Need true isolation for a risky migration? Create a throwaway Neon branch by
  hand for that one case — no standing automation required.

## Sweeping stale branches

`neon-cleanup.yml` (manual) lists/deletes leftover `pr-*` / `preview/*`
branches — use it once to clear the old per-PR branches after the integration
branching is disabled.
