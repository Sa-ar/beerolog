# Operator drill: request correlation

When an end-user reports a failure, this drill walks the operator from the
report → the exact request → the exact log line → the failure category in
~60 seconds. Lives here under `docs/ops/checklists/` per ADR-0001.

## Inputs you need from the user

- A timestamp (within ±5 minutes is fine)
- Optional: the `X-Request-ID` value if they happened to copy it from the
  error message. Our typed-error responses include `request_id` in the body.

## 1. Check liveness vs readiness

- `curl https://<api>/health` — always 200 if the process is up.
- `curl https://<api>/health/ready` — 200 iff config + DB + embedding
  provider are all `ok`. Returns a per-component breakdown:
  - `process` — process is running, with `env=development|preview|production`
  - `config` — every required env var is present, no dev-defaults in prod
  - `embedding_provider` — `OPENAI_API_KEY` configured
  - `database` — a `SELECT 1` succeeded against the pool

If any component is `degraded` / `down`, treat it as the failure mode and
stop here. The user's report is almost certainly downstream of that.

## 2. Correlate the request

Every API response carries the `X-Request-ID` header (set by
`instrument_requests`). Every completed request logs the same id with the
request method, path, status, and duration.

If the user gave you a `request_id`:

```bash
grep "<request_id>" /var/log/beerolog/api.log
```

If not, narrow by timestamp + path:

```bash
grep -E "<approx-iso-ts>.*POST /recommendations" /var/log/beerolog/api.log
```

## 3. Classify the failure

A typed-error response body has the shape:

```json
{
  "error_type": "auth" | "validation" | "config" | "dependency",
  "detail": "...",
  "request_id": "..."
}
```

Map by `error_type`:

| `error_type` | HTTP | Likely cause | First action |
|---|---|---|---|
| `auth` | 401 | Bearer token missing / invalid / expired Clerk session | Confirm Clerk JWKS is reachable; have the user retry from a clean sign-in |
| `validation` | 400 | Malformed payload from the web client | Inspect the request body in the log; check `apps/web/src/lib/api.ts` for a contract drift |
| `config` | 503 | A required env var is missing or invalid | Check `GET /health/ready`; fix env in Vercel; redeploy |
| `dependency` | 503 | OpenAI / Postgres / Clerk JWKS upstream failure | Check the provider status page; check the `instrument_requests` log line for the duration to narrow which dependency timed out |

A generic 500 (no `error_type` in body) means an *unexpected* failure — the
`Unhandled error` log line has the request id and the full stack. File a
bug; do not retry blindly.

## 4. What you should NOT find in logs

The readiness route and the typed-error handler never echo:

- The full `DATABASE_URL` (only the exception class name on connect failure)
- The `OPENAI_API_KEY` value (only its presence/absence)
- Clerk secret keys
- Request bodies or bearer tokens (per `instrument_requests`)

If any of these *do* appear, that's a bug — file it as a security issue.
