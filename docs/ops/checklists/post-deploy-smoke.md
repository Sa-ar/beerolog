# Post-deploy smoke

The shortest end-to-end path that exercises the supported MVP user flow
after a deploy. Capture every request id; if any step fails, run the
`request-correlation-drill.md` against the failing component before
retrying.

## Prerequisites

- API deployed and `GET /health/ready` returns 200 with every component `ok`
- Web deployed and reachable
- A test Clerk user available for the target environment

## 1. Sign-in path

- [ ] Open the web URL
- [ ] Sign in with the test Clerk user (social-only — Google / Apple /
      Facebook / Instagram per ADR-0002)
- [ ] Landing route loads without auth errors in the browser console
- [ ] Network tab: the first authenticated API call carries a Clerk
      bearer token AND returns `X-Request-ID` in the response header

## 2. Recommendations smoke

Until slice #76 lands, the easiest verifier is the debug endpoint:

- [ ] `GET /debug/recommendations` returns 200 with 5 ranked beers
- [ ] Each beer carries `name`, `brewery`, `style`, `abv`, `market_tier`, `why_line`, `breakdown`
- [ ] `breakdown.dominant_component` varies across results (not all the same value)
- [ ] `breakdown.total_score` is monotonically non-increasing across the
      5 results (top result is highest score)

After slice #76 + #77 land, replace the debug endpoint with the actual
onboarding + session flow.

## 3. Configuration safety net

- [ ] `GET /health/ready` still returns 200 after traffic
- [ ] Force a 503 to confirm typed-error wiring (only in preview):
      hit a route that requires Clerk without a bearer, expect
      `401` with body `{error_type: "auth", detail, request_id}`
- [ ] Force a 503 to confirm config wiring (only in preview):
      temporarily blank `OPENAI_API_KEY` in Railway, redeploy, confirm
      app refuses to start with `ConfigError: ... OPENAI_API_KEY missing`

## 4. Capture for release evidence

Write to `docs/ops/releases/<YYYY-MM-DD>-<version>.md`:

- Vercel + Railway build URLs
- `GET /health/ready` JSON output
- The 5-beer payload from step 2 (truncate `embedding` arrays)
- Any request ids captured from typed-error tests

## What “green” means

All of:

- Sign-in completes without browser console errors
- Recommendations return 5 beers with full breakdowns
- Readiness reports every component `ok`
- Every error response includes `error_type` + `request_id`

If any one of those is not green, the deploy is not green.
