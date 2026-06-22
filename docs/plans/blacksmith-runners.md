# Plan: Adopt Blacksmith runners for the onboarding e2e

Status: **deferred / ready to enable**. The workflow is already wired so turning
this on is config-only — no code change.

## Why

The onboarding e2e (`apps/web/e2e`, Playwright + `pnpm install` + Chromium) runs
~4 min on GitHub's `ubuntu-latest`. [Blacksmith](https://www.blacksmith.sh)
provides drop-in faster runners (~2x faster, ~half the per-minute cost, 4x
faster colocated cache). Free tier: **3,000 2vCPU-minutes/month per org** — our
e2e is infrequent (push to `main` via the staging pipeline, manual dispatch, or
the `e2e` PR label), so it stays within the free tier.

## Prerequisite (repo admin — one-time)

1. Install the **Blacksmith GitHub App** on the repo/org: https://www.blacksmith.sh
   → connect GitHub → authorize for `Sa-ar/beerolog`. Until this is done the
   `blacksmith-*` runner labels will not resolve and jobs would queue forever.

## Enable (config-only, already wired)

The e2e job uses `runs-on: ${{ vars.E2E_RUNNER || 'ubuntu-latest' }}`
(`.github/workflows/e2e.yml`).

1. Repo → Settings → Secrets and variables → Actions → **Variables** → New
   variable: `E2E_RUNNER` = `blacksmith-2vcpu-ubuntu-2204`.
   - `2vcpu` keeps runs in the free tier. Use `blacksmith-4vcpu-ubuntu-2204`
     for ~2x speed (consumes free minutes at 2x the rate).
2. Trigger a run (`workflow_dispatch` on `e2e.yml`, or push to `main`) and
   confirm in the run logs that the job picked up a Blacksmith runner and passed.

## Optional: faster caching

Once on Blacksmith, swap GitHub's cache for Blacksmith's colocated cache:
- Replace `actions/setup-node@v4` (`cache: pnpm`) with `useblacksmith/setup-node`
  or add `useblacksmith/cache@v5` keyed on `pnpm-lock.yaml`.
- Cache the Playwright browser download (`~/.cache/ms-playwright`) via
  `useblacksmith/cache` or `useblacksmith/stickydisk` to cut the
  `playwright install` step.

## Rollback

Delete/clear the `E2E_RUNNER` variable — the job falls back to `ubuntu-latest`.
No code change, takes effect on the next run.

## Cost guardrails

- The e2e makes one OpenAI call (embedding + icon + persona) on the dev API per
  run, and is **not** per-PR — it runs on `main` pushes (staging pipeline),
  manual dispatch, or the `e2e` label only.
- Watch usage in the Blacksmith dashboard; 3,000 2vCPU-min/mo is the free cap.

## Later (optional)

The lightweight `sync` / `wait-for-deploy` jobs in `staging.yml` and the main CI
(`ci.yml` typecheck/lint/test) can also move to Blacksmith the same way
(parameterize their `runs-on`), but the payoff is smaller than the e2e.
