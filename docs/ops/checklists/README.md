# Operator checklists

Store durable operator-facing checklists here, such as deploy sequencing, post-deploy smoke verification, or launch-readiness runbooks.

## Current checklists

- [`deploy-sequence.md`](deploy-sequence.md) — canonical order for shipping to preview / production
- [`post-deploy-smoke.md`](post-deploy-smoke.md) — shortest end-to-end path that exercises the MVP user flow after a deploy
- [`troubleshooting.md`](troubleshooting.md) — first-line guidance for launch-critical failure modes
- [`request-correlation-drill.md`](request-correlation-drill.md) — user-report → request → log line → failure category
- [`origin-alignment.md`](origin-alignment.md) — cross-system contract for Vercel + Railway + Clerk origins (added by #65)

## Naming

- Prefer one checklist per file
- Use descriptive names such as `deploy-sequence.md` or `post-deploy-smoke.md`
- If a checklist is environment-specific, make that explicit in the filename or heading
