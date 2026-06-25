#!/usr/bin/env bash
set -euo pipefail

# Run web + api for this worktree on auto-resolved, per-worktree ports.
# Port resolution + frontend/CORS wiring lives in scripts/ports.sh (shared so
# separate panes agree). This just sources it and starts both servers.
#
# Launch web/api ONLY via these scripts (or `pnpm dev:web` / `pnpm dev:api`): a
# raw uvicorn/vite or an editor run misses the per-worktree ports, so the api's
# CORS and the web's VITE_API_URL fall back to :3000/:8000 and hit the wrong
# worktree.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
set -a; . "$ROOT/scripts/ports.sh"; set +a   # resolves + writes the claim first

echo "worktree ports → web :$WEB_PORT  api :$API_PORT"

# Warn if this worktree still points at a remote (shared) DB — `pnpm dev` alone
# doesn't provision one; `pnpm worktree` / `pnpm db:up` does. Guards against
# silently developing against the shared Vercel DB.
db_url="$(grep -E '^DATABASE_URL=' "$ROOT/apps/api/.env" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '\"')"
if [[ -n "$db_url" && "$db_url" != *localhost* && "$db_url" != *127.0.0.1* ]]; then
  echo "⚠️  dev: DATABASE_URL looks remote (shared DB). Run 'pnpm db:up' for an isolated worktree DB." >&2
fi

# run both; Ctrl-C kills both. Children re-source ports.sh and reuse the claim.
trap 'kill 0' EXIT
pnpm --dir "$ROOT" dev:api &
pnpm --dir "$ROOT" dev:web &
wait
