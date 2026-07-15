#!/bin/bash
# ============================================
# Quick Deploy Script - Pull, Build, Restart
# Usage: bash quick-deploy.sh
# Run on ECS server at /opt/personal-website
# ============================================

set -e

PROJECT_DIR="/opt/personal-website"
cd "$PROJECT_DIR/nuxt-app"

echo "=== Quick Deploy ==="
echo "Time: $(date)"

# Pull latest code
echo "[1/3] Pulling latest code..."
git pull origin main

# Rebuild Docker image
echo "[2/3] Rebuilding Docker image..."
docker compose build --no-cache

# Restart services
echo "[3/3] Restarting services..."
docker compose up -d

# Health check
echo ""
echo "Health check..."
sleep 10
if curl -sf http://localhost:3000/ > /dev/null; then
  echo "✅ Deploy successful!"
  echo "Website: http://$(curl -s ifconfig.me)"
else
  echo "⚠️  Website not responding, checking logs..."
  docker compose logs --tail=20
fi
