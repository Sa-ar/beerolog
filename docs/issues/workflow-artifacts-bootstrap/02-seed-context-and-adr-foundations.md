# Seed context and launch boundary

## What to build

Seed the canonical repo context and first ADR so future PRDs inherit shared language and a clear launch-first product boundary.

## Acceptance criteria

- `CONTEXT.md` states that the signed-in solo flow is the supported MVP
- Venue/scan, group, challenge, leaderboard, badges, and broader social or bar tooling are called out as deferred
- `docs/adr/0001-launch-first-product-boundary.md` records the boundary decision and its consequences
- Shared docs use consistent supported-versus-deferred language

## Blocked by

`01-create-workflow-artifacts.md`

## Notes

Keep deferred surfaces visible as follow-on work, but not as launch scope.
