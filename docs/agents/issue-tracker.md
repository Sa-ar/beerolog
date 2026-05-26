# Issue Tracker

Beerolog tracks planning work in local markdown files, not GitHub Issues.

## Canonical locations

- PRDs live in `docs/prds/<feature-slug>.md`
- Approved execution slices live in `docs/issues/<feature-slug>/`
- Slice files are numbered in execution order: `01-...md`, `02-...md`, `03-...md`

## Local metadata

When a workflow step needs a tracker status, encode it in the markdown file instead of applying a remote label:

- `Status: <role>` for lifecycle state such as `needs-triage` or `ready-for-agent`
- `Type: <kind>` for high-level categorization such as `bug` or `enhancement`

Add these lines near the top of a slice document when the skill you are using expects tracker metadata.

## When a skill says "publish to the issue tracker"

- `/to-prd`: create or update `docs/prds/<feature-slug>.md`
- `/to-issues`: create or update files under `docs/issues/<feature-slug>/`
- `/triage`: update the existing local markdown artifact in place rather than opening or editing a GitHub issue

Do not create GitHub issues or labels unless the user explicitly asks for tracker sync.

## When a skill says "fetch the relevant ticket"

Treat a PRD path or issue-slice path as the ticket reference. If the user gives a path, read that file directly. If they give a feature name, resolve it to the matching file under `docs/prds/` or `docs/issues/`.
