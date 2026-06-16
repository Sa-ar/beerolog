# Release evidence records

Store release evidence records here for specific launch candidates or deployments. Each record should capture what was verified, where it was verified, and any explicitly accepted non-blocking issues.

## Naming

- Prefer one record per release candidate or deployment
- Use a date and short slug, for example `2026-05-26-launch-candidate.md`
- Keep older records for historical traceability instead of overwriting them

## Required sections per release record

The post-deploy smoke (`docs/ops/checklists/post-deploy-smoke.md`) captures into these files. At minimum every record must include:

- A one-line summary at the top: what changed in this release
- Vercel + Railway build URLs
- Origin triple in effect (Railway `CORS_ALLOWED_ORIGINS` + Vercel `VITE_API_BASE_URL` + Clerk Allowed Origins) — see `docs/ops/checklists/origin-alignment.md`
- `GET /health/ready` JSON output, every component
- Smoke output from `docs/ops/checklists/post-deploy-smoke.md` — including a sample 5-beer recommendations payload with `embedding` arrays truncated
- Any request ids captured from intentional typed-error tests

The release record is the source of truth when investigating a regression — it answers “what was working when?” without depending on third-party log retention.
