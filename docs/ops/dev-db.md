# Preview / development database

One shared Neon branch backs **all** preview deployments — not a branch per PR.
Simple, and it never hits the Neon branch quota. Trade-off: previews share
schema and data (no per-PR isolation), so a migration on the shared branch is
visible to every preview at once.

## Branches (at rest)

| Neon branch | Used by |
|---|---|
| `production` | prod (`DATABASE_URL` = `PROD_DATABASE_URL`) |
| `preview` | every Vercel preview deploy (shared) |
| `preview/staging` | staging env |
| `vercel-dev` | local dev |

## Workflows

- **Setup shared preview DB** (`setup-preview-db.yml`, manual) — idempotent.
  Creates the `preview` branch off production, points the API project's
  Preview-scoped `DATABASE_URL` at it, and runs migrations. **Re-run it after a
  schema change** to migrate the shared branch (it's the migrate button too).
- **Neon branch sweep** (`neon-cleanup.yml`) — every 6h (+ manual) deletes every
  branch except the default (`production`) and the keep-list
  (`preview,preview/staging,vercel-dev`; override via repo var
  `NEON_KEEP_BRANCHES`). Manual runs dry-run unless `apply` is ticked.
- **Migrate prod DB** (`migrate-prod.yml`) — prod migrations, unchanged.

## Stopping per-deploy branch creation (one-time, dashboard)

The Neon–Vercel integration (`icfg_tjOM…`, scoped to **All Projects** in
*Vercel*) creates a `preview/<branch>` branch per preview deploy. To stop it for
beerolog without touching other projects:

1. Vercel → team scope → **Integrations** → **Neon** → **Manage** → **Project
   Access** → switch *All Projects* → **Specific Projects** → leave `beerolog`
   and `beerolog-api` unchecked. (Alt: Vercel → **Storage** → the Neon DB →
   disconnect those two projects.)
2. Production is unaffected — prod `DATABASE_URL` is a standalone secret, not
   integration-owned. Previews keep working against the shared `preview` branch
   via the Preview `DATABASE_URL` set by `setup-preview-db.yml`.

Until that toggle is flipped, the 6h sweep keeps the churn under the quota.

## Need true isolation for a risky migration?

Spin up a throwaway Neon branch by hand for that one case — no standing
automation required.
