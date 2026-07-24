#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://127.0.0.1:3000}
DISK_WARN=${DISK_WARN:-80}

curl -fsS "$BASE_URL/" >/dev/null
if command -v docker >/dev/null 2>&1; then
  status=$(docker inspect -f '{{.State.Health.Status}}' personal-website 2>/dev/null || true)
  [[ "$status" == healthy ]] || { echo "container health is $status" >&2; exit 1; }
fi
usage=$(df -P / | awk 'NR==2 {gsub(/%/,"",$5); print $5}')
if (( usage >= DISK_WARN )); then echo "disk usage ${usage}% exceeds ${DISK_WARN}%" >&2; exit 2; fi
echo "healthy url=$BASE_URL disk=${usage}%"
