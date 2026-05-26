# Document PRD and slice conventions

## What to build

Document how future contributors should write PRDs and local issue slices so the workflow can move from context to ADRs to PRDs to implementation slices without relying on chat history.

## Acceptance criteria

- `docs/prds/README.md` defines the required PRD sections
- `docs/issues/README.md` defines the slice folder and file naming conventions
- `docs/issues/README.md` uses the standard slice template: `Title`, `What to build`, `Acceptance criteria`, `Blocked by`, `Notes`
- The guidance keeps the launch-first product boundary explicit

## Blocked by

`02-seed-context-and-adr-foundations.md`

## Notes

Favor slices that can be executed independently and verified locally.
