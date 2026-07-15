#!/bin/bash
# ============================================
# Immich Setup Script (run on local server)
# Usage: bash setup-immich.sh
# ============================================

set -e

INSTALL_DIR="/opt/immich"

echo "=== Immich Setup ==="

# Create directory
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Copy docker-compose
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cp "$SCRIPT_DIR/../config/immich/docker-compose.yml" "$INSTALL_DIR/docker-compose.yml"

# Create .env
if [ ! -f .env ]; then
  echo "Creating .env..."
  DB_PASSWORD=$(openssl rand -hex 16)
  echo "DB_PASSWORD=${DB_PASSWORD}" > .env
  echo "  .env created with random DB password"
fi

# Create data directories
mkdir -p photos pgdata model-cache

# Start services
echo "Starting Immich..."
docker compose up -d

echo ""
echo "=== Immich Setup Complete ==="
echo "Access at: http://localhost:2283"
echo "First time: create admin account in browser"
echo ""
echo "Via frp tunnel: http://120.26.231.150:2283"
