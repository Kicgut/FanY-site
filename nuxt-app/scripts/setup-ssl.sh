#!/bin/bash
# ============================================
# HTTPS Setup with Let's Encrypt (Certbot)
# Usage: bash setup-ssl.sh <domain>
# Prerequisites: Nginx installed, domain DNS pointing to this server
# ============================================

set -e

DOMAIN="$1"

if [ -z "$DOMAIN" ]; then
  echo "Usage: bash setup-ssl.sh <domain>"
  echo "  Example: bash setup-ssl.sh example.com"
  echo ""
  echo "Prerequisites:"
  echo "  1. Domain DNS A record pointing to this server's IP"
  echo "  2. Nginx installed and running"
  echo "  3. Port 80 accessible from internet"
  exit 1
fi

echo "=== HTTPS Setup for ${DOMAIN} ==="

# Install certbot
echo "[1/4] Installing certbot..."
apt install -y certbot python3-certbot-nginx

# Get certificate
echo "[2/4] Obtaining SSL certificate..."
certbot --nginx -d "$DOMAIN" -d "www.${DOMAIN}" --non-interactive --agree-tos --email "admin@${DOMAIN}"

# Update Nginx config
echo "[3/4] Updating Nginx config..."
# Certbot auto-updates the Nginx config, but let's verify
nginx -t

# Setup auto-renewal
echo "[4/4] Setting up auto-renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer

echo ""
echo "=== HTTPS Setup Complete ==="
echo "Website accessible at: https://${DOMAIN}"
echo "Certificate auto-renews via certbot timer"
echo ""
echo "Verify renewal: certbot renew --dry-run"
