# Deploy sequence

The canonical order for shipping a Beerolog change to preview or
production. Stop at any step that fails — do not skip ahead.

## 0. Prerequisites (one-time per environment)

- Vercel project linked to the repo, branch → environment mapping set
- `beerolog-api` Vercel project linked, env vars populated from `docs/ops/environment-matrix.md`
- Neon database provisioned with the `vector` extension enabled
- Clerk instance provisioned per `docs/services/clerk.md`
- Web + API + Clerk origin alignment confirmed (`docs/ops/checklists/origin-alignment.md`)

## 1. Environment review (before merge)

- [ ] Read `docs/ops/environment-matrix.md` end-to-end
- [ ] Diff the PR's `.env.example` against the running env vars on both Vercel projects; add any new key to **both** before merge
- [ ] If the PR adds an env knob with a non-default value (e.g. `MATCH_ALPHA`, `EMBEDDING_MODEL`), confirm the prod value is intentional, not the local dev value

## 2. Contract sync verification (deploy blocker)

The web depends on the API's generated OpenAPI client. If they drift,
the browser breaks silently.

- [ ] On the merge commit: regenerate `apps/web/src/lib/api-client/schema.d.ts` from the API
- [ ] If the file changed, the PR is **not** ready to deploy — amend with the regenerated client
- [ ] `git status` must be clean against the PR head before proceeding

## 3. Database migrations

- [ ] `pnpm --filter @beerolog/db db:generate` produces no new migration
      (if it does, the schema source-of-truth and the migrations have
      drifted — fix before deploying)
- [ ] Apply pending migrations to the target environment:
      `DATABASE_URL=... pnpm --filter @beerolog/db db:migrate`
- [ ] Migrations are forward-only — do **not** edit a merged migration;
      author a new one

## 4. API deploy (Vercel — `beerolog-api`)

- [ ] Push to the deploy branch (Vercel picks it up automatically)
- [ ] Watch the build log for the lifespan start line:
      `Starting Beerolog API env=... database_configured=true openai_configured=true`
- [ ] If startup fails, look for `ConfigError` in the log — the
      non-development safety enforcer (#45) lists every missing piece in
      one line. Fix env vars on `beerolog-api`, redeploy. **Do not bypass.**

## 5. Web deploy (Vercel)

- [ ] Vercel auto-deploys from the same branch
- [ ] Confirm the build references the right `VITE_API_BASE_URL` and `VITE_CLERK_PUBLISHABLE_KEY` (matching the API + Clerk env)
- [ ] After deploy, the build URL must hit the right API origin (test once with the network tab)

## 6. Health and readiness verification

From the operator workstation:

- [ ] `curl https://<api>/health` returns `200 {"status":"ok"}`
- [ ] `curl https://<api>/health/ready` returns `200`, every component `ok`
- [ ] If any component is `degraded` or `down`, **abort the deploy**:
      run `docs/ops/checklists/request-correlation-drill.md` against the
      component's `detail` and fix before continuing

## 7. Smoke test

Run `docs/ops/checklists/post-deploy-smoke.md` end to end. Capture
request IDs from each step for the release evidence record.

## 8. Release evidence (production only)

- [ ] Save the smoke output + readiness output + both Vercel build URLs to `docs/ops/releases/<YYYY-MM-DD>-<version>.md`
- [ ] Reference the new file in the PR's deploy comment

## Roll-back

- Web: redeploy the prior Vercel build (one click)
- API: promote the prior `beerolog-api` deployment (one click)
- DB migrations: **forward-only**. If a migration is bad, ship a
  follow-up migration that reverts the schema. Do not edit history.
