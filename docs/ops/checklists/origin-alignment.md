# Origin alignment

Vercel (web), Railway (API), and Clerk all have their own notion of
“allowed origin.” When they disagree, the user sees a 401 or a CORS
failure with no obvious culprit. This checklist locks the three
systems together as one durable contract — supersedes `wontfix`’d ad‐hoc
discovery.

A mismatch here is a **deploy blocker** — do not ship past step 2 of
`deploy-sequence.md` without confirming this list.

## Per-environment origins

Every environment owns exactly **two** web origins (Vercel preview
branch + branch alias) and **one** API origin (Railway).

| Env | Web origin | API origin | Clerk instance |
|---|---|---|---|
| development | `http://localhost:3000` | `http://localhost:8000` | Clerk dev shared credentials |
| preview | `https://<branch>-beerolog.vercel.app` | `https://<branch>-beerolog-api.up.railway.app` | Clerk dev instance |
| production | `https://beerolog.example.com` | `https://api.beerolog.example.com` | Clerk production instance |

Fill the production hosts with the real values from
`docs/ops/environment-matrix.md` before relying on this table.

## The contract

For each environment, **all three** must agree:

### 1. Railway → `CORS_ALLOWED_ORIGINS`

The API enforces a hard allowlist via `app/main.py`'s `CORSMiddleware`
and the `enforce_non_development_safety` enforcer (#45):

- Comma-separated, every entry includes `http://` or `https://`
- No wildcards (`*`, `*.example.com`) — enforcer refuses to start
- Must include every web origin for the env

### 2. Vercel → `VITE_API_BASE_URL`

The web client makes requests to this URL. It must match the API
origin in the same row above. If preview hits prod's API by accident,
Clerk JWKS mismatches will cascade into 401s.

### 3. Clerk Dashboard → Allowed Origins

Clerk sign-in flows post back to the origin that initiated them. The
Clerk dashboard's “Allowed Origins” list must include every web
origin for the env. Forgotten preview branch origins are the most
common cause of “sign-in pops up, never returns.”

Clerk also enforces JWT issuer/audience per-instance. The web's
`VITE_CLERK_PUBLISHABLE_KEY` and the API's `CLERK_SECRET_KEY` /
`CLERK_PUBLISHABLE_KEY` must come from the **same** Clerk instance.

## Per-deploy verification

Fill these in before merging a deploy PR:

- [ ] Railway `CORS_ALLOWED_ORIGINS` includes every web origin for this env
- [ ] Railway has no wildcards in `CORS_ALLOWED_ORIGINS` (the #45 enforcer would refuse the deploy anyway, but catching it pre-deploy saves a roll-forward)
- [ ] Vercel `VITE_API_BASE_URL` matches the Railway API origin
- [ ] Vercel `VITE_CLERK_PUBLISHABLE_KEY` matches Clerk's published key for the env
- [ ] Railway `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` come from the same Clerk instance as Vercel's publishable
- [ ] Clerk dashboard “Allowed Origins” for the env includes every Vercel origin (preview alias + branch URL)
- [ ] If the deploy is for a long-lived preview, the branch's auto-generated URL has been added too — Vercel issues a per-branch URL that Clerk does not auto-discover

## Contract-sync verification (deploy blocker)

In addition to origin alignment, the **OpenAPI client contract**
between API and web must be in sync, per `deploy-sequence.md` step 2:

- [ ] Regenerate `apps/web/src/lib/api-client/schema.d.ts` from the deployed API
- [ ] If the file changed, **abort the deploy** and ship a follow-up PR with the regenerated client. A drifted client is a silent prod break.

## Roll-back posture

An origin mismatch never requires a code change — it's always a
config fix. Order of operations:

1. Fix the offending dashboard value (Railway, Vercel, or Clerk)
2. Redeploy the affected side (Vercel rebuild is fastest)
3. Re-run `post-deploy-smoke.md` step 1 (sign-in path)

Do **not** roll back code for an origin issue — you'd lose unrelated
changes and still have the bad config.

## Capturing launch evidence

Every production deploy records to
`docs/ops/releases/<YYYY-MM-DD>-<version>.md`:

- The exact origin triple in effect (Railway + Vercel + Clerk Allowed Origins screenshot or text dump)
- The Vercel + Railway build URLs
- `GET /health/ready` JSON output
- The smoke output from `post-deploy-smoke.md`

This is what the team falls back to when investigating any future
origin regression.
