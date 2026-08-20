# Troubleshooting

First-line guidance for the launch-critical failure modes. Pair this
with `request-correlation-drill.md` — use the drill to find the right
request, use this doc to figure out what to do about it.

## Symptom: web shows a blank or stuck sign-in

Likely **Clerk JWKS unreachable** or **mismatched publishable key**.

- Confirm `VITE_CLERK_PUBLISHABLE_KEY` on Vercel matches the Clerk
  instance the user is hitting (dev vs prod)
- Check the Clerk status page
- `GET /health/ready` — `config.detail` will say “Clerk keys missing”
  if the API never received them

## Symptom: every API call returns 401

- The user's Clerk session expired or was revoked. Have them sign out and back in.
- If a **fresh** sign-in still 401s: API and web are pointing at different Clerk instances. Check `CLERK_SECRET_KEY` on `beerolog-api` vs `VITE_CLERK_PUBLISHABLE_KEY` on the web project.

## Symptom: API responses include `error_type: "config"`

The non-development safety enforcer (#45) raised at runtime, OR a route
dependency raised `ConfigError`.

- `GET /health/ready` will repeat the same component breakdown
- Set the missing env var on `beerolog-api`, redeploy
- **Never** redeploy with the dev `API_SECRET` — the enforcer refuses it

## Symptom: API responses include `error_type: "dependency"`

Upstream provider failure: OpenAI rate limit, Postgres connection
refused, Clerk JWKS slow.

- Check the recent `instrument_requests` log line for the affected
  request id. The duration field tells you which upstream call dragged.
- For OpenAI: confirm the org has quota; the embedding model name in
  `EMBEDDING_MODEL` is valid for the org
- For Postgres: confirm the Neon project is awake; check pgvector is
  enabled (`CREATE EXTENSION IF NOT EXISTS vector;`)

## Symptom: recommendations are all 5 lagers (or all wrong style)

The **matcher** is doing what was asked but the placeholder catalog
(slice #74) is small and biased. After slice #75 lands the real Israeli
catalog, re-run the check.

If the bias persists after slice #75:

- Run the persona harness (slice #79). If `precision@5 < 0.4`, the
  algorithm regressed — file a bug, do not tune knobs by hand in prod.
- Check that `MATCH_ALPHA` and `MATCH_BETA` on `beerolog-api` match the values
  validated by the most recent persona-harness run.

## Symptom: `/health/ready` says `database: down`

The `detail` field is the exception class name (we never leak DSN).
Common cases:

- `OSError` / `ConnectionRefusedError` — wrong host or Neon project
  asleep. Wake or reconfigure.
- `InvalidPasswordError` — wrong `DATABASE_URL` credentials
- `UndefinedTableError` — migrations not applied. Run
  `pnpm --filter @beerolog/db db:migrate`.
- `UndefinedObjectError` referencing `vector` — pgvector extension is
  not enabled on the target database. Run
  `CREATE EXTENSION IF NOT EXISTS vector;` and redeploy.

## Symptom: deploy succeeded, but `/health/ready` returns 503 immediately

The lifespan ran the safety enforcer (#45) and one of its rules failed.
The startup log line names every problem. Common cases:

- `CORS_ALLOWED_ORIGINS contains wildcard` — someone set `*` on `beerolog-api`
- `API_SECRET is still the dev default` — nobody overrode it in prod
- `Clerk keys missing` — env vars never made it to `beerolog-api`

Fix on `beerolog-api`, redeploy. Do **not** add an exception to the enforcer.

## When to escalate

- Generic 500s with no `error_type` and a stack trace in the log — file a bug
- DSN, API key, or bearer token appearing in any log — file a security issue
- More than one consecutive deploy failing the smoke test — pause deploys and run the persona harness against the prior known-good build
