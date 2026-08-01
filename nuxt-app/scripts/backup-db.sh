#!/usr/bin/env bash
# Create a consistent production SQLite backup on ECS before a release.

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/personal-website}"
COMPOSE_FILE="$PROJECT_DIR/nuxt-app/docker-compose.yml"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
backup_name="prod.db.$(date +%Y%m%d-%H%M%S).backup"

[[ -f "$COMPOSE_FILE" ]] || { echo "Compose file not found: $COMPOSE_FILE" >&2; exit 1; }
mkdir -p "$BACKUP_DIR"

docker compose -f "$COMPOSE_FILE" exec -T --user root app \
  sqlite3 /app/data/prod.db ".backup '/app/backups/$backup_name'"

[[ -s "$BACKUP_DIR/$backup_name" ]] || { echo "Backup was not created: $BACKUP_DIR/$backup_name" >&2; exit 1; }
echo "Database backup created: $BACKUP_DIR/$backup_name"
