#!/usr/bin/env bash
set -euo pipefail

# Provision THIS worktree's database, migrate, and seed.
#   db.sh up [neon|local]   create/reuse an isolated DB, point .env at it, migrate + seed
#   db.sh down [neon|local] tear it down (delete neon branch / remove docker volume)
#   db.sh seed              seed only, against the current DATABASE_URL
#   db.sh prune             reap DBs/ports from worktrees removed behind our back
#
# Mode = $2, else $DB_MODE, else 'local'.
#   local — (default) a pgvector Postgres in docker, isolated per worktree, on a
#           free port. No cloud secrets. Falls back to the shared DB if docker
#           isn't running.
#   neon  — a Neon branch per worktree. Opt-in. Needs a project-scoped
#           NEON_API_KEY + NEON_PROJECT_ID. No keys -> keep the shared
#           DATABASE_URL and DON'T seed (never seed the shared/prod branch).

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/apps/api/.env"
COMPOSE="$ROOT/docker-compose.yml"
CMD="${1:-up}"
MODE="${2:-${DB_MODE:-local}}"
PROJECT="beerolog-$(printf %s "$ROOT" | cksum | cut -d' ' -f1)"

branch_name() { echo "wt/$(git -C "$ROOT" rev-parse --abbrev-ref HEAD | tr '/' '-')"; }
from_env_file() { grep -E "^$1=" "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '"'; }

set_database_url() { # $1 = url ; replace/insert DATABASE_URL in apps/api/.env
  local tmp; tmp="$(mktemp)"
  grep -v '^DATABASE_URL=' "$ENV_FILE" 2>/dev/null > "$tmp" || true
  echo "DATABASE_URL=\"$1\"" >> "$tmp"
  mv "$tmp" "$ENV_FILE"
  export DATABASE_URL="$1"
}

migrate_and_seed() {
  pnpm --dir "$ROOT" db:migrate
  pnpm --dir "$ROOT/packages/db" db:seed
}

neon_keys() {
  : "${NEON_API_KEY:=$(from_env_file NEON_API_KEY)}"
  : "${NEON_PROJECT_ID:=$(from_env_file NEON_PROJECT_ID)}"
  [[ -n "${NEON_API_KEY:-}" && -n "${NEON_PROJECT_ID:-}" ]] || return 1
  # Export so neonctl reads the key from the environment, not from an --api-key
  # argv (which would be visible in `ps` / process listings).
  export NEON_API_KEY NEON_PROJECT_ID
}

up_neon() {
  if ! neon_keys; then
    echo "db: NEON_API_KEY / NEON_PROJECT_ID not set — keeping shared DATABASE_URL, skipping seed." >&2
    echo "    Set them in apps/api/.env for branch-per-worktree, or use DB_MODE=local." >&2
    return 0
  fi
  local b; b="$(branch_name)"
  echo "db: ensuring neon branch '${b}'..."
  npx -y neonctl branches create --project-id "$NEON_PROJECT_ID" --name "$b" \
    >/dev/null 2>&1 || true   # already exists -> reuse
  local conn
  conn="$(npx -y neonctl connection-string "$b" --project-id "$NEON_PROJECT_ID" \
    --role-name neondb_owner --database-name neondb)"
  set_database_url "$conn"
  migrate_and_seed
  echo "db: neon branch '$b' ready + seeded"
}

down_neon() {
  neon_keys || return 0
  npx -y neonctl branches delete "$(branch_name)" --project-id "$NEON_PROJECT_ID" \
    >/dev/null 2>&1 || true
  echo "db: neon branch '$(branch_name)' deleted"
}

up_local() {
  if ! docker info >/dev/null 2>&1; then
    echo "db: docker not running — keeping shared DATABASE_URL from Vercel, skipping seed." >&2
    echo "    start Docker and rerun 'pnpm db:up' for an isolated local DB." >&2
    return 0
  fi
  set -a; . "$ROOT/scripts/ports.sh"; set +a   # gives DB_PORT (free, per worktree)
  COMPOSE_PROJECT_NAME="$PROJECT" DB_PORT="$DB_PORT" docker compose -f "$COMPOSE" up -d
  set_database_url "postgresql://postgres:postgres@localhost:$DB_PORT/beerolog"
  echo "db: waiting for postgres on :${DB_PORT}..."
  until COMPOSE_PROJECT_NAME="$PROJECT" docker compose -f "$COMPOSE" exec -T db \
    pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
  migrate_and_seed
  echo "db: local postgres ready on :$DB_PORT + seeded"
}

down_local() {
  if ! docker info >/dev/null 2>&1; then
    echo "db: docker not running — nothing to tear down." >&2
    return 0
  fi
  COMPOSE_PROJECT_NAME="$PROJECT" docker compose -f "$COMPOSE" down -v
  echo "db: local postgres + volume removed"
}

# Reap leaks from worktrees removed behind our back (e.g. via Superset's UI,
# which gives us no teardown hook). Deletes neon wt/* branches with no live
# worktree, and local docker + port claims whose worktree path is gone.
prune() {
  if neon_keys; then
    local live dead
    live="$(git -C "$ROOT" worktree list --porcelain \
      | awk '/^branch /{sub("refs/heads/","",$2); gsub("/","-",$2); print "wt/"$2}')"
    dead="$(npx -y neonctl branches list --project-id "$NEON_PROJECT_ID" \
      --output json 2>/dev/null \
      | node -e 'const j=JSON.parse(require("fs").readFileSync(0,"utf8"));const a=Array.isArray(j)?j:(j.branches||[]);for(const b of a){const n=String(b.name||"");if(n.startsWith("wt/"))console.log(n)}')"
    while IFS= read -r b; do
      [[ -z "$b" ]] && continue
      if ! grep -qxF "$b" <<<"$live"; then
        npx -y neonctl branches delete "$b" --project-id "$NEON_PROJECT_ID" \
          >/dev/null 2>&1 || true
        echo "prune: deleted orphan neon branch $b"
      fi
    done <<<"$dead"
  fi

  local reg="${TMPDIR:-/tmp}/beerolog-dev-ports"
  for claim in "$reg"/*; do
    [[ -e "$claim" ]] || continue
    local p; p="$(sed -n 2p "$claim")"
    if [[ -n "$p" && ! -d "$p" ]]; then
      COMPOSE_PROJECT_NAME="beerolog-$(basename "$claim")" \
        docker compose -f "$COMPOSE" down -v >/dev/null 2>&1 || true
      rm -f "$claim"
      echo "prune: cleaned worktree (path gone: $p)"
    fi
  done
}

# Defense-in-depth: this is dev tooling. Never let it provision a DB while
# running inside a Vercel build/deploy or with a non-dev APP_ENV — prod/preview
# get their Neon DATABASE_URL injected by Vercel, and we must not overwrite it.
APP_ENV_NOW="${APP_ENV:-$(from_env_file APP_ENV)}"
if [[ -n "${VERCEL:-}" || "$APP_ENV_NOW" == production || "$APP_ENV_NOW" == preview ]]; then
  echo "db.sh: refusing to run in a non-dev environment (APP_ENV='${APP_ENV_NOW:-}', VERCEL='${VERCEL:-}')." >&2
  exit 1
fi

case "$CMD" in
  up)   if [[ "$MODE" == local ]]; then up_local; else up_neon; fi ;;
  down) if [[ "$MODE" == local ]]; then down_local; else down_neon; fi ;;
  seed) pnpm --dir "$ROOT/packages/db" db:seed ;;
  prune) prune ;;
  *) echo "usage: db.sh {up|down|seed|prune} [neon|local]" >&2; exit 1 ;;
esac
