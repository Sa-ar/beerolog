# Issue Tracker

Beerolog tracks planning work in GitHub Issues.

## Canonical locations

- PRDs live in `docs/prds/<feature-slug>.md`
- Active execution slices live in GitHub Issues
- `docs/issues/README.md` documents the retired local-tracker directory

## GitHub issue expectations

When publishing or updating an execution slice in GitHub, keep the issue body explicit about:

- The parent PRD path and link
- What to build
- Acceptance criteria
- Blocked by
- Current intended status such as `ready-for-agent` or `ready-for-human`

## When a skill says "publish to the issue tracker"

- `/to-prd`: create or update `docs/prds/<feature-slug>.md`
- `/to-issues`: create or update GitHub issues, linking the parent PRD
- `/triage`: update the existing GitHub issue instead of editing an archived local markdown slice

## When a skill says "fetch the relevant ticket"

Treat a GitHub issue number or URL as the primary ticket reference. If the user gives a PRD path, read that file directly. If they give a path under `docs/issues/`, treat it as historical context only if that file still exists.
