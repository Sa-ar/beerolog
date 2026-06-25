#!/usr/bin/env bash
set -euo pipefail

# Clean-remove a worktree: tear down its DB + drop its port claim, then remove
# the worktree. Use this from the CLI; Superset's UI removal doesn't call it
# (that's what `pnpm wt:prune` reaps).
#
#   pnpm wt:rm [path]   (defaults to the current worktree)

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Resolve to the worktree ROOT, not a subdir we happen to be cd'd into — else DB
# teardown can't find scripts/db.sh and the port-claim cksum won't match ports.sh.
TARGET="$(git -C "${1:-$PWD}" rev-parse --show-toplevel)"
MAIN="$(dirname "$(git -C "$ROOT" rev-parse --path-format=absolute --git-common-dir)")"

if [[ "$TARGET" == "$MAIN" ]]; then
  echo "wt:rm: refusing to remove the main checkout" >&2
  exit 1
fi

# Tear down both DB modes best-effort — we don't persist which one this worktree
# used, and each teardown is a no-op when nothing's there.
( cd "$TARGET" && bash scripts/db.sh down neon ) || true
( cd "$TARGET" && bash scripts/db.sh down local ) || true

rm -f "${TMPDIR:-/tmp}/beerolog-dev-ports/$(printf %s "$TARGET" | cksum | cut -d' ' -f1)"

# No --force: git refuses if the worktree has uncommitted changes. Commit/stash
# or pass it through yourself if you really mean to discard them.
git -C "$ROOT" worktree remove "$TARGET"
echo "wt:rm: removed $TARGET"
