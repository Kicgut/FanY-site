#!/bin/bash
# ============================================
# Nginx Setup Script for ECS
# Usage: bash setup-nginx.sh [domain]
# ============================================

set -e

DOMAIN="${1:-_}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Nginx Setup ==="

# Install Nginx
echo "[1/4] Installing Nginx..."
apt install -y nginx

# Copy config
echo "[2/4] Configuring Nginx..."
cp "$SCRIPT_DIR/../config/nginx/personal-website.conf" /etc/nginx/sites-available/personal-website

# Update server_name
sed -i "s/server_name _;/server_name ${DOMAIN};/" /etc/nginx/sites-available/personal-website

# Enable site
ln -sf /etc/nginx/sites-available/personal-website /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test config
echo "[3/4] Testing Nginx config..."
nginx -t

# Restart
echo "[4/4] Starting Nginx..."
systemctl enable nginx
systemctl restart nginx

echo ""
echo "=== Nginx Setup Complete ==="
echo "Website accessible at: http://${DOMAIN}"
echo ""
echo "Next: setup SSL with certbot for HTTPS"
