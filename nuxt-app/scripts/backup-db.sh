#!/bin/bash
# backup-db.sh — Simple SQLite backup script
# Copies dev.db to /mnt/data/personal-website/db/prod.db.YYYY-MM-DD
# Keeps last 30 days of backups

set -euo pipefail

DB_SOURCE="/mnt/data/personal-website/nuxt-app/prisma/dev.db"
BACKUP_DIR="/mnt/data/personal-website/db"
DATE_TAG=$(date +%Y-%m-%d)
BACKUP_FILE="${BACKUP_DIR}/prod.db.${DATE_TAG}"
KEEP_DAYS=30

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Check source exists
if [ ! -f "$DB_SOURCE" ]; then
  echo "[ERROR] Source database not found: $DB_SOURCE"
  exit 1
fi

# Create backup
cp "$DB_SOURCE" "$BACKUP_FILE"
echo "[OK] Backup created: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

# Clean up old backups (keep last $KEEP_DAYS days)
DELETED=0
find "$BACKUP_DIR" -name "prod.db.*" -type f -mtime +${KEEP_DAYS} | while read -r old_file; do
  rm -f "$old_file"
  echo "[CLEANUP] Removed old backup: $old_file"
  DELETED=$((DELETED + 1))
done

# Summary
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "prod.db.*" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)

echo ""
echo "=== Backup Summary ==="
echo "Source:    $DB_SOURCE"
echo "Latest:    $BACKUP_FILE"
echo "Total:     $TOTAL_BACKUPS backup(s) in $BACKUP_DIR"
echo "Dir size:  $TOTAL_SIZE"
echo "Retention: last $KEEP_DAYS days"
echo "Done."
