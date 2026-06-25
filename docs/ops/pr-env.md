# Per-PR ephemeral environments

Every PR gets an isolated stack: a Neon DB branch wired into dedicated Vercel
preview deploys of the web and API projects. Defined in
`.github/workflows/pr-env.yml`.

## How it works

On `opened` / `reopened` / `synchronize`:

1. **Neon branch** `pr-<number>` is created off `main` (copy-on-write — it
   inherits `main`'s seeded catalog, so no per-PR seeding and no OpenAI cost).
2. `drizzle-kit migrate` applies any pending migrations to the branch.
3. **API preview**: the branch's pooled `DATABASE_URL` is set as a
   branch-scoped Preview env var, then the API is built locally and shipped with
   `vercel deploy --prebuilt`. Its preview URL is captured.
4. **Web preview**: `VITE_API_URL` is set to that API URL (branch-scoped), then
   the web app is built and deployed the same way.
5. A PR comment posts both URLs.

On `closed`: the Neon branch and the branch-scoped env vars are deleted.

## Why `--prebuilt` (single build, no wasted minutes)

CI builds locally, so Vercel runs **no remote build** for our deploy. That lets
us suppress the duplicate git-triggered preview build via each project's
**Ignored Build Step** without affecting our own deploy or production.

## One-time cutover (do this AFTER the workflow is green on a test PR)

Set the Ignored Build Step on **both** projects so git pushes stop building
previews (production still builds). Skips when not production:

```bash
CMD='bash -c '\''[ "$VERCEL_ENV" = production ] && exit 1 || exit 0'\'''
for P in "$VERCEL_API_PROJECT_ID" "$VERCEL_WEB_PROJECT_ID"; do
  curl -fsS -X PATCH \
    "https://api.vercel.com/v9/projects/$P?teamId=$VERCEL_TEAM_ID" \
    -H "Authorization: Bearer $VERCEL_TOKEN" -H 'Content-Type: application/json' \
    -d "$(jq -n --arg c "$CMD" '{commandForIgnoringBuildStep:$c}')"
done
```

Rollback: PATCH the same field back to `null`.

## Required CI config

| Kind | Name |
|---|---|
| secret | `NEON_API_KEY`, `VERCEL_TOKEN` |
| variable | `NEON_PROJECT_ID`, `VERCEL_TEAM_ID`, `VERCEL_API_PROJECT_ID`, `VERCEL_WEB_PROJECT_ID` |

## Known things to verify on the first test PR

- `vercel build` for the **Python API** in CI (monorepo root install). If it
  trips, the fix is usually a `vercel pull`-provided build env or a Python setup
  step before `vercel build`.
- Neon action output names (`db_url`, `db_url_pooled`) and the
  create/delete-branch action major versions.
