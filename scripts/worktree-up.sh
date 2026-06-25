#!/usr/bin/env bash
set -euo pipefail

# ponytail: bootstrap a fresh git worktree — pull env from Vercel (the source of
# truth), install deps, then run web + api together.
#   worktree-up.sh             setup + run the stack (default)
#   worktree-up.sh --no-serve  setup only (env + install), don't run
# Re-runnable: env pull skips existing files, pnpm install no-ops when current.
# Ports are per-worktree — see scripts/dev.sh.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MAIN="$(dirname "$(git -C "$ROOT" rev-parse --path-format=absolute --git-common-dir)")"

# Provision $1/.env (apps/api|apps/web) from Vercel's development env. .vercel/
# is gitignored, so copy the (non-secret) project link from main first. Falls
# back to copying main's .env when offline / not logged in.
pull_env() {
  local app="$1" dir="$ROOT/$1"
  [[ -f "$dir/.env" ]] && return 0
  if [[ ! -f "$dir/.vercel/project.json" && -f "$MAIN/$app/.vercel/project.json" ]]; then
    mkdir -p "$dir/.vercel"
    cp "$MAIN/$app/.vercel/project.json" "$dir/.vercel/project.json"
  fi
  if (cd "$dir" && vercel env pull .env --environment=development --yes >/dev/null 2>&1); then
    echo "env: pulled $app/.env from Vercel (development)"
  elif [[ -f "$MAIN/$app/.env" ]]; then
    cp "$MAIN/$app/.env" "$dir/.env"
    echo "env: Vercel unavailable — copied $app/.env from main checkout"
  else
    echo "env: could not provision $app/.env (no Vercel access, no main copy)" >&2
  fi
}

setup() {
  # Lock so two panes opening at once don't race pnpm install. mkdir is atomic.
  local lock="$ROOT/node_modules/.worktree-up.lock"
  mkdir -p "$ROOT/node_modules"
  if ! mkdir "$lock" 2>/dev/null; then
    echo "worktree-up: setup already running in another pane, waiting..."
    while [[ -d "$lock" ]]; do sleep 1; done
    return
  fi
  # RETURN removes the lock on the normal path (before we exec dev.sh); EXIT
  # covers the `set -e` abort path so a failed install / db.sh up can't leave a
  # stale lock that deadlocks every later run in the `while [[ -d ]]` wait below.
  trap 'rmdir "$lock" 2>/dev/null || true' RETURN EXIT

  # primary env from Vercel (source of truth)
  pull_env apps/api
  pull_env apps/web
  # local-only extras Vercel doesn't hold — copy from main if present
  for f in apps/web/.env.local apps/web/.env.e2e; do
    if [[ ! -f "$ROOT/$f" && -f "$MAIN/$f" ]]; then
      cp "$MAIN/$f" "$ROOT/$f"
      echo "env: copied $f from main checkout"
    fi
  done

  # node deps here; uv/python deps are synced by dev:api on start
  pnpm --dir "$ROOT" install

  # provision an isolated DB for this worktree (local docker by default; falls
  # back to the shared Vercel DB if docker isn't running). best-effort.
  bash "$ROOT/scripts/db.sh" up || echo "worktree-up: db provisioning skipped"

  # reap leaks from previously-removed worktrees, in the background so it never
  # slows startup. Creating a worktree is a natural cadence for this.
  ( bash "$ROOT/scripts/db.sh" prune >/dev/null 2>&1 & )
}

setup

if [[ "${1:-}" == "--no-serve" ]]; then
  echo "worktree-up: ready. run 'pnpm dev' to start web + api on this worktree's ports."
  exit 0
fi

exec bash "$ROOT/scripts/dev.sh"
