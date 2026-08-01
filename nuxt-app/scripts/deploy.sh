#!/usr/bin/env bash
# Deploy a prebuilt, verified image on ECS. Never build on ECS.
# Usage: deploy.sh <image.tar.gz> <image-reference> [image.tar.gz.sha256]

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/personal-website}"
COMPOSE_FILE="$PROJECT_DIR/nuxt-app/docker-compose.yml"

usage() {
  echo "Usage: $0 <image.tar.gz> <image-reference> [image.tar.gz.sha256]" >&2
  echo "Example: $0 /opt/personal-website/releases/personal-website-<commit>.tar.gz personal-website:<commit>" >&2
  exit 2
}

[[ $# -ge 2 && $# -le 3 ]] || usage

archive=$1
image_ref=$2
checksum_file=${3:-"${archive}.sha256"}

[[ -f "$archive" ]] || { echo "Image archive not found: $archive" >&2; exit 1; }
[[ -f "$checksum_file" ]] || { echo "Checksum file not found: $checksum_file" >&2; exit 1; }
[[ -f "$COMPOSE_FILE" ]] || { echo "Compose file not found: $COMPOSE_FILE" >&2; exit 1; }

echo "Verifying image archive..."
checksum_dir=$(dirname "$checksum_file")
(
  cd "$checksum_dir"
  sha256sum -c "$(basename "$checksum_file")"
)

echo "Loading verified image..."
docker load --input "$archive"
docker image inspect "$image_ref" >/dev/null

had_current_image=false
if docker image inspect personal-website:latest >/dev/null 2>&1; then
  echo "Creating a pre-deployment database backup..."
  bash "$PROJECT_DIR/nuxt-app/scripts/backup-db.sh"
  docker tag personal-website:latest personal-website:rollback
  had_current_image=true
fi

docker tag "$image_ref" personal-website:latest

echo "Applying explicit Prisma migrations..."
if ! docker compose -f "$COMPOSE_FILE" run --rm app npx prisma migrate deploy; then
  if [[ "$had_current_image" == true ]]; then
    docker tag personal-website:rollback personal-website:latest
  fi
  echo "Migration failed; the running container was not replaced." >&2
  exit 1
fi

echo "Recreating application container..."
docker compose -f "$COMPOSE_FILE" up -d --no-build app
docker compose -f "$COMPOSE_FILE" ps app

for _ in {1..10}; do
  if curl -fsS http://127.0.0.1:3000/ >/dev/null; then
    echo "Deployment complete: personal-website:latest"
    exit 0
  fi
  sleep 3
done

echo "Container started but the local health check did not pass." >&2
exit 1
