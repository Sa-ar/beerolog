# Issue tracker

GitHub Issues are Beerolog's source of truth for execution tracking.

This directory no longer stores active slice files. Keep execution tickets in GitHub and keep PRDs in `docs/prds/`.

## Canonical locations

- PRDs live in `docs/prds/<feature-slug>.md`
- Active execution slices live in GitHub Issues

## Working rules

- Create new execution slices in GitHub, not as markdown files under `docs/issues/`
- Keep dependencies explicit in the GitHub issue body under `Blocked by`
- Keep acceptance criteria concrete enough to verify locally
- Preserve the launch-first boundary: supported solo flow first, deferred surfaces clearly marked as deferred
- Keep environment matrices, operator checklists, and release evidence under `docs/ops/`, not in this directory
