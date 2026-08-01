#!/usr/bin/env bash
# Roll back ECS to an already-loaded image. Never check out source or build.
# Usage: rollback.sh <image-reference> --schema-compatible

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/personal-website}"
COMPOSE_FILE="$PROJECT_DIR/nuxt-app/docker-compose.yml"

if [[ $# -ne 2 || "$2" != "--schema-compatible" ]]; then
  echo "Usage: $0 <image-reference> --schema-compatible" >&2
  echo "Confirm that the target image is compatible with the current database schema before rolling back." >&2
  exit 2
fi

image_ref=$1
[[ -f "$COMPOSE_FILE" ]] || { echo "Compose file not found: $COMPOSE_FILE" >&2; exit 1; }
docker image inspect "$image_ref" >/dev/null

if docker image inspect personal-website:latest >/dev/null 2>&1; then
  docker tag personal-website:latest personal-website:rollback
fi
docker tag "$image_ref" personal-website:latest

docker compose -f "$COMPOSE_FILE" up -d --no-build app
docker compose -f "$COMPOSE_FILE" ps app
echo "Rollback container started with $image_ref. Run the production smoke checks before declaring recovery complete."
