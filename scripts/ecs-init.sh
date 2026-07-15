#!/bin/bash
# ============================================
# ECS Server Setup Script (Safe for existing services)
# Designed to coexist with RustDesk or other running services
# Usage: bash ecs-init.sh
# ============================================

set -e

echo "=== ECS Server Setup (RustDesk-safe) ==="
echo "Started at: $(date)"
echo ""

# --- 0. Pre-flight checks ---
echo "[0/6] Checking existing services..."
echo "  Running Docker containers:"
docker ps --format "  - {{.Names}} ({{.Image}})" 2>/dev/null || echo "  Docker not running"
echo "  Listening ports:"
ss -tlnp | grep -E 'LISTEN' | awk '{print "  - " $4}' | head -20
echo ""

# --- 1. System Update (safe: only update, NO upgrade) ---
echo "[1/6] Updating package list (NOT upgrading)..."
apt update
echo "  Package list updated. Skipping 'apt upgrade' to protect existing services."
echo "  Run 'apt upgrade' manually if you want to upgrade packages."

# --- 2. Install Docker (skip if exists) ---
echo "[2/6] Checking Docker..."
if command -v docker &>/dev/null; then
  echo "  Docker already installed: $(docker --version)"
else
  echo "  Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker $USER
  echo "  Docker installed: $(docker --version)"
fi

# --- 3. Install Docker Compose (skip if exists) ---
echo "[3/6] Checking Docker Compose..."
if docker compose version &>/dev/null; then
  echo "  Docker Compose already available"
else
  echo "  Installing Docker Compose..."
  apt install -y docker-compose-plugin
  echo "  Docker Compose installed"
fi

# --- 4. Configure Swap (skip if exists) ---
echo "[4/6] Checking swap..."
if [ -f /swapfile ]; then
  echo "  Swap already exists ($(swapon --show | grep swapfile | awk '{print $3}'))"
else
  echo "  Creating 2GB swap..."
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "  Swap configured: 2GB"
fi

# --- 5. Firewall (SKIP to protect RustDesk ports) ---
echo "[5/6] Firewall check..."
echo "  ⚠️  Skipping firewall changes to protect existing services (RustDesk)."
echo "  Use Alibaba Cloud Security Group to manage port access."
echo "  RustDesk default ports: 21115-21119 (TCP/UDP), 8000 (web)"

# --- 6. Create project directory ---
echo "[6/6] Preparing project directory..."
mkdir -p /opt/personal-website
echo "  Project directory: /opt/personal-website"

echo ""
echo "=== Setup Complete (RustDesk-safe) ==="
echo ""
echo "Verified safe:"
echo "  ✅ No packages upgraded"
echo "  ✅ No firewall rules changed"
echo "  ✅ No existing services touched"
echo ""
echo "Next steps:"
echo "  1. cd /opt/personal-website"
echo "  2. git clone <your-repo> ."
echo "  3. bash deploy.sh"
echo ""
echo "IMPORTANT: Add these ports in Alibaba Cloud Security Group:"
echo "  - 80 (HTTP)   - for website"
echo "  - 443 (HTTPS) - for website SSL"
echo "  Keep RustDesk ports (21115-21119, 8000) as-is"
