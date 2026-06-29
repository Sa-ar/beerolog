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

## Keeping the branch count down (automatic)

The Vercel-Neon integration keeps creating `preview/<branch>` branches per
deploy and there's no toggle we can reach. `neon-cleanup.yml` ("Neon branch
sweep") handles it: every 6h it deletes every branch except the default
(`production`) and a keep-list (`preview/staging,vercel-dev`, override via repo
variable `NEON_KEEP_BRANCHES`). So the quota never fills again.

- Manual run = **dry-run** (lists what it would delete) unless you tick `apply`.
- Scheduled runs always apply.
- Deleting a preview branch drops that preview's DB until the PR is
  redeployed (the integration recreates it on the next deploy).
