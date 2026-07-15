#!/bin/bash
# ============================================
# Comprehensive Backup Script
# Run on local server (cron: 0 3 * * *)
# Usage: bash backup-all.sh
# ============================================

set -e

BACKUP_ROOT="/mnt/backup"
DATE=$(date +%Y%m%d-%H%M%S)
LOG_FILE="/var/log/backup.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Backup Started ==="

# --- 1. ECS website database ---
log "[1/4] Backing up website database..."
ssh -o ConnectTimeout=10 root@120.26.231.150 \
  "docker compose -f /opt/personal-website/nuxt-app/docker-compose.yml exec -T app sqlite3 /app/data/prod.db '.backup /tmp/backup.db'" 2>/dev/null || {
  log "  ⚠️  SSH to ECS failed, skipping website backup"
}

# Copy from ECS
mkdir -p "$BACKUP_ROOT/website"
scp -o ConnectTimeout=10 root@120.26.231.150:/tmp/backup.db \
  "$BACKUP_ROOT/website/backup-${DATE}.db" 2>/dev/null || {
  log "  ⚠️  SCP failed, skipping"
}

# Compress old backups
gzip "$BACKUP_ROOT/website/backup-${DATE}.db" 2>/dev/null || true

# --- 2. Immich database ---
log "[2/4] Backing up Immich database..."
mkdir -p "$BACKUP_ROOT/immich"
cd /opt/immich
docker compose exec -T immich-db pg_dump -U postgres immich | \
  gzip > "$BACKUP_ROOT/immich/immich-${DATE}.sql.gz" 2>/dev/null || {
  log "  ⚠️  Immich DB backup failed"
}

# --- 3. Sync photos to external drive ---
log "[3/4] Syncing photos to external drive..."
EXTERNAL_DRIVE="/mnt/external"
if [ -d "$EXTERNAL_DRIVE" ]; then
  rsync -avz --delete /opt/immich/photos/ "$EXTERNAL_DRIVE/photos/" 2>/dev/null || {
    log "  ⚠️  Photo sync failed"
  }
else
  log "  ⚠️  External drive not mounted at $EXTERNAL_DRIVE"
fi

# --- 4. Cleanup old backups (keep 7 days) ---
log "[4/4] Cleaning up old backups..."
find "$BACKUP_ROOT" -name "*.db.gz" -mtime +7 -delete 2>/dev/null
find "$BACKUP_ROOT" -name "*.sql.gz" -mtime +7 -delete 2>/dev/null

# Summary
log "=== Backup Complete ==="
log "  Website backups: $(ls "$BACKUP_ROOT/website/"*.db.gz 2>/dev/null | wc -l) files"
log "  Immich backups: $(ls "$BACKUP_ROOT/immich/"*.sql.gz 2>/dev/null | wc -l) files"
