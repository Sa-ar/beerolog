#!/usr/bin/env bash
# Upsert a git-branch-scoped Preview env var on a Vercel project.
# Usage: vercel-set-env.sh <projectId> <KEY> <VALUE> <gitBranch>
# Env: VERCEL_TOKEN, VERCEL_TEAM_ID
set -euo pipefail
PROJECT_ID="$1"; KEY="$2"; VALUE="$3"; BRANCH="$4"
API="https://api.vercel.com"
AUTH=(-H "Authorization: Bearer ${VERCEL_TOKEN}")
Q="teamId=${VERCEL_TEAM_ID}"

# Delete any existing var with the same key + branch so the upsert is clean.
ids=$(curl -fsS "${API}/v9/projects/${PROJECT_ID}/env?${Q}" "${AUTH[@]}" \
  | jq -r --arg k "$KEY" --arg b "$BRANCH" \
      '.envs[] | select(.key==$k and .gitBranch==$b) | .id')
for id in $ids; do
  curl -fsS -X DELETE "${API}/v9/projects/${PROJECT_ID}/env/${id}?${Q}" "${AUTH[@]}" >/dev/null
done

curl -fsS -X POST "${API}/v10/projects/${PROJECT_ID}/env?${Q}" "${AUTH[@]}" \
  -H 'Content-Type: application/json' \
  -d "$(jq -n --arg k "$KEY" --arg v "$VALUE" --arg b "$BRANCH" \
        '{key:$k,value:$v,type:"encrypted",target:["preview"],gitBranch:$b}')" >/dev/null
echo "set ${KEY} (branch ${BRANCH}) on project ${PROJECT_ID}"
