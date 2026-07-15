#!/bin/sh
# ============================================
# SQLite Restore Script
# Runs inside the Docker container
# Usage: sh restore.sh <backup_file.db.gz>
# ============================================

set -e

DB_PATH="${DATABASE_URL#file:}"
BACKUP_FILE="$1"

if [ -z "${BACKUP_FILE}" ]; then
  echo "Usage: sh restore.sh <backup_file.db.gz>"
  echo ""
  echo "Available backups:"
  ls -la /app/backups/backup-*.db.gz 2>/dev/null || echo "  No backups found"
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

echo "Restoring from: ${BACKUP_FILE}"
echo "Target database: ${DB_PATH}"

# Backup current database before restore
if [ -f "${DB_PATH}" ]; then
  CURRENT_BACKUP="${DB_PATH}.before-restore-$(date +%Y%m%d-%H%M%S)"
  cp "${DB_PATH}" "${CURRENT_BACKUP}"
  echo "Current DB backed up to: ${CURRENT_BACKUP}"
fi

# Decompress and restore
gunzip -c "${BACKUP_FILE}" > "${DB_PATH}"
echo "Restore completed successfully!"
