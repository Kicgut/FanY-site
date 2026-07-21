#!/usr/bin/env bash
set -euo pipefail

API_BASE="${PHOTO_SYNC_API_BASE:-http://120.26.231.150}"
TOKEN="${PHOTO_SYNC_TOKEN:-${PHOTO_BACKFLOW_TOKEN:-}}"
ECS_HOST="${ECS_HOST:-120.26.231.150}"
ECS_USER="${ECS_USER:-root}"
LIMIT="${PHOTO_SYNC_LIMIT:-20}"
ROOT="${PHOTO_THUMBNAILS_ROOT:-/mnt/data/personal-website/thumbnails}"
LOCK="${PHOTO_SYNC_LOCK_FILE:-$HOME/.cache/personal-website/photo-thumbnail-sync.lock}"
mkdir -p "$(dirname "$LOCK")"
exec 9>"$LOCK"
flock -n 9 || exit 0
auth=(); [[ -n "$TOKEN" ]] && auth=(-H "x-photo-backflow-token: $TOKEN")
command -v jq >/dev/null && command -v curl >/dev/null && command -v scp >/dev/null

json=$(curl -fsS "${auth[@]}" "$API_BASE/api/photos/sync?limit=$LIMIT")
count=$(jq '.data.photos | length' <<<"$json")
for ((i=0; i<count; i++)); do
  photo=$(jq -c ".data.photos[$i]" <<<"$json")
  id=$(jq -r '.id' <<<"$photo")
  if [[ "$(curl -fsS -X POST "${auth[@]}" -H 'Content-Type: application/json' -d "{\"photoId\":$id}" "$API_BASE/api/photos/sync/claim" | jq -r '.claimed')" != true ]]; then continue; fi
  source=$(jq -r '.thumbPath // empty' <<<"$photo")
  [[ -f "$source" ]] || { curl -fsS -X POST "${auth[@]}" -H 'Content-Type: application/json' -d "{\"photoId\":$id,\"error\":\"thumbnail not found\"}" "$API_BASE/api/photos/sync/fail" >/dev/null; continue; }
  month=$(basename "$(dirname "$source")")
  target="/opt/personal-website/uploads/photos/thumbnails/$month/$(basename "$source")"
  ssh "$ECS_USER@$ECS_HOST" "mkdir -p $(dirname "$target")"
  scp "$source" "$ECS_USER@$ECS_HOST:$target"
  curl -fsS -X POST "${auth[@]}" -H 'Content-Type: application/json' -d "{\"photoId\":$id,\"ecsThumbPath\":\"/app/public/uploads/photos/thumbnails/$month/$(basename "$source")\"}" "$API_BASE/api/photos/sync/complete" >/dev/null
done
