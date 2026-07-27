# Incident: build-breaking bug reached main (2026-07-28)

## What happened
A duplicate `export function updateAnalyticsConsent` in
`apps/web/src/lib/analytics.ts` reached `main` and broke the production build
(Vercel deploy). It was a **squash-merge artifact**: PR #311 (consent gate) and
the stacked PR #312 (instrumentation) both contained the function; squashing
#312 onto a `main` that already had #311's squash duplicated it.

## Why CI didn't catch it
CI (`.github/workflows/ci.yml`) ran typecheck + lint + tests but **not a
production build**. `tsc` does not flag a duplicate `export function` the way
esbuild does, so the failure only surfaced at `vite build` — which only ran on
Vercel, *after* merge. Every PR showed green CI.

## Fix
- Removed the duplicate (PR #313).
- **Added `pnpm --dir apps/web build` to the CI `typescript` job** so any
  build-only failure blocks the PR before merge.

## Lessons
- **typecheck ≠ build.** Keep a real production build in CI for anything that
  ships a bundle. `tsc --noEmit` misses errors the bundler enforces.
- **Squash-merging stacked PRs can duplicate code** present in both. When the
  base PR merges, rebase the upper branch onto the squashed `main` and re-verify
  — do not trust the upper PR's pre-merge green CI.
- After merging a stack, build `main` locally (or let CI do it) before assuming
  it's deployable.
