#!/usr/bin/env bash
# Remove a git-branch-scoped Preview env var from a Vercel project.
# Usage: vercel-rm-env.sh <projectId> <KEY> <gitBranch>
# Env: VERCEL_TOKEN, VERCEL_TEAM_ID
set -euo pipefail
PROJECT_ID="$1"; KEY="$2"; BRANCH="$3"
API="https://api.vercel.com"
AUTH=(-H "Authorization: Bearer ${VERCEL_TOKEN}")
Q="teamId=${VERCEL_TEAM_ID}"

ids=$(curl -fsS "${API}/v9/projects/${PROJECT_ID}/env?${Q}" "${AUTH[@]}" \
  | jq -r --arg k "$KEY" --arg b "$BRANCH" \
      '.envs[] | select(.key==$k and .gitBranch==$b) | .id')
for id in $ids; do
  curl -fsS -X DELETE "${API}/v9/projects/${PROJECT_ID}/env/${id}?${Q}" "${AUTH[@]}" >/dev/null
  echo "removed ${KEY} (branch ${BRANCH}) from project ${PROJECT_ID}"
done
