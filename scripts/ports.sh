#!/usr/bin/env bash
# Resolve THIS worktree's web + api ports once and share them, so the frontend
# and backend agree no matter how they're launched (one `pnpm dev`, or api and
# web in separate Superset panes). Source me; I export WEB_PORT, API_PORT,
# VITE_API_URL, CORS_ALLOWED_ORIGINS.
#
# Why central: the dependency is circular — web needs the api port
# (VITE_API_URL) and api needs the web port (CORS). Both must be picked in one
# place before either starts, then persisted so whoever starts second reuses
# them.
#
# Ports are claimed in a shared registry keyed by worktree path. A claim is
# honored even while that worktree is idle, so two worktrees never land on the
# same port; restarting a worktree reuses its own ports.

_ports_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
_ports_reg="${TMPDIR:-/tmp}/beerolog-dev-ports"
_ports_claim="$_ports_reg/$(printf %s "$_ports_root" | cksum | cut -d' ' -f1)"
mkdir -p "$_ports_reg"

_ports_busy()    { (echo >"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }   # something listening now?
# reserved by any worktree? Check only line 1 (the ports), not line 2 (the
# worktree path, which can contain port-like numbers and cause false skips).
_ports_claimed() {
  local f
  for f in "$_ports_reg"/*; do
    [[ -e "$f" ]] || continue
    head -1 "$f" | grep -qw "$1" && return 0
  done
  return 1
}
_ports_free() {
  local p=$1
  while _ports_busy "$p" || _ports_claimed "$p"; do p=$((p + 1)); done
  echo "$p"
}

if [[ -f "$_ports_claim" ]]; then
  read -r WEB_PORT API_PORT DB_PORT < "$_ports_claim"
else
  # ponytail: tiny race if two worktrees resolve in the same instant before
  # either writes its claim — just rerun. Stale claims from deleted worktrees
  # leak slowly; port space is huge so it doesn't matter for years.
  WEB_PORT=$(_ports_free 3000)
  API_PORT=$(_ports_free 8000)
  DB_PORT=$(_ports_free 5432)   # local docker postgres (DB_MODE=local)
  # line 1: ports (read back below) | line 2: worktree path (for `wt:prune`)
  { echo "$WEB_PORT $API_PORT $DB_PORT"; echo "$_ports_root"; } > "$_ports_claim"
fi

export WEB_PORT API_PORT DB_PORT
export VITE_API_URL="http://localhost:$API_PORT"        # Vite: shell VITE_* beats .env
export CORS_ALLOWED_ORIGINS="http://localhost:$WEB_PORT" # pydantic: real env beats .env
