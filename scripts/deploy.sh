#!/bin/bash
# ============================================
# Deploy Script for ECS
# Run this after ecs-init.sh
# Usage: bash deploy.sh [git-repo-url]
# ============================================

set -e

PROJECT_DIR="/opt/personal-website"
REPO_URL="${1:-}"

echo "=== Deploy Personal Website ==="

# --- 0. Port conflict check ---
echo "[0/4] Checking port 3000..."
if ss -tlnp | grep -q ":3000 "; then
  echo "  ⚠️  Port 3000 is already in use!"
  ss -tlnp | grep ":3000 "
  echo "  Change PORT in docker-compose.yml or stop the conflicting service."
  exit 1
else
  echo "  Port 3000 is free ✅"
fi

# --- 1. Clone or pull project ---
if [ -d "$PROJECT_DIR/.git" ]; then
  echo "[1/4] Pulling latest code..."
  cd "$PROJECT_DIR"
  git pull
elif [ -n "$REPO_URL" ]; then
  echo "[1/4] Cloning project..."
  git clone "$REPO_URL" "$PROJECT_DIR"
  cd "$PROJECT_DIR"
else
  echo "Usage: bash deploy.sh [git-repo-url]"
  echo "  First time: bash deploy.sh https://github.com/user/repo.git"
  echo "  Update:     bash deploy.sh"
  exit 1
fi

# --- 2. Setup .env ---
if [ ! -f .env ]; then
  echo "[2/4] Creating .env from template..."
  cp .env.example .env
  # Generate random JWT secret
  JWT_SECRET=$(openssl rand -hex 32)
  sed -i "s/change-me-in-production/${JWT_SECRET}/" .env
  echo "  .env created with random JWT_SECRET"
else
  echo "[2/4] .env already exists, skipping..."
fi

# --- 3. Build and start ---
echo "[3/4] Building Docker image..."
docker compose build --no-cache

echo "[4/4] Starting services..."
docker compose up -d

# --- 4. Verify ---
echo ""
echo "=== Deploy Complete ==="
echo "Checking service status..."
docker compose ps
echo ""
echo "Health check..."
sleep 5
if curl -sf http://localhost:3000/ > /dev/null; then
  echo "✅ Website is running at http://localhost:3000"
else
  echo "⚠️  Website not responding yet, wait 30s and check: curl http://localhost:3000/"
fi
