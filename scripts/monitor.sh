#!/bin/bash
# ============================================
# Health Monitor Script
# Run via cron every 15 minutes
# Usage: bash monitor.sh
# ============================================

set -e

ALERT_LOG="/var/log/monitor.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

log() {
  echo "[$TIMESTAMP] $1" >> "$ALERT_LOG"
}

# Check website
if curl -sf --max-time 10 http://localhost:3000/ > /dev/null 2>&1; then
  log "✅ Website OK"
else
  log "❌ Website DOWN - attempting restart..."
  cd /opt/personal-website/nuxt-app && docker compose restart
  sleep 15
  if curl -sf --max-time 10 http://localhost:3000/ > /dev/null 2>&1; then
    log "✅ Website recovered after restart"
  else
    log "❌ Website still DOWN after restart!"
  fi
fi

# Check disk usage
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 85 ]; then
  log "⚠️  Disk usage high: ${DISK_USAGE}%"
else
  log "✅ Disk OK: ${DISK_USAGE}%"
fi

# Check memory
MEM_FREE=$(free -m | awk 'NR==2 {print $7}')
if [ "$MEM_FREE" -lt 200 ]; then
  log "⚠️  Memory low: ${MEM_FREE}MB free"
else
  log "✅ Memory OK: ${MEM_FREE}MB free"
fi
