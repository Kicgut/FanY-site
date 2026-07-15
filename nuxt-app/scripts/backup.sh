#!/bin/sh
# ============================================
# SQLite Backup Script
# Runs inside the Docker container
# Usage: sh backup.sh [backup_dir]
# ============================================

set -e

DB_PATH="${DATABASE_URL#file:}"
BACKUP_DIR="${1:-/app/backups}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup-${TIMESTAMP}.db"
KEEP_DAYS=7

echo "[${TIMESTAMP}] Starting backup..."
echo "  Database: ${DB_PATH}"
echo "  Backup to: ${BACKUP_FILE}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Use sqlite3 .backup for safe online backup
# (safer than cp - avoids corruption if DB is being written)
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "${DB_PATH}" ".backup '${BACKUP_FILE}'"
else
  # Fallback: use cp (less safe but works)
  cp "${DB_PATH}" "${BACKUP_FILE}"
fi

# Compress the backup
gzip "${BACKUP_FILE}"
echo "  Compressed: ${BACKUP_FILE}.gz"

# Clean up old backups (keep last N days)
echo "  Cleaning backups older than ${KEEP_DAYS} days..."
find "${BACKUP_DIR}" -name "backup-*.db.gz" -mtime +${KEEP_DAYS} -delete 2>/dev/null || true

# Count remaining backups
REMAINING=$(find "${BACKUP_DIR}" -name "backup-*.db.gz" | wc -l)
echo "  Remaining backups: ${REMAINING}"

echo "[${TIMESTAMP}] Backup completed successfully!"
