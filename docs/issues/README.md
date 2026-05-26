# Issue slices

Issue docs turn an approved PRD into small local execution slices. The PRD itself captures requirements; the follow-on slicing work happens here.

## File layout

- After PRD approval, store slices under `docs/issues/<feature-slug>/`
- Number files in execution order: `01-...md`, `02-...md`, `03-...md`
- Keep slices local-first unless a later workflow adds tracker sync

## Slice format

Each slice should contain:

- `Title` as the document H1
- `What to build`
- `Acceptance criteria`
- `Blocked by`
- `Notes`

## Working rules

- Prefer vertical slices that produce visible progress
- Avoid layer-only tasks that split frontend, backend, and data work apart without user value
- Keep dependencies explicit in `Blocked by`
- Make acceptance criteria concrete enough to verify locally
- Preserve the launch-first boundary: supported solo flow first, deferred surfaces clearly marked as deferred
- Keep environment matrices, operator checklists, and release evidence under `docs/ops/`, not in issue-slice directories
