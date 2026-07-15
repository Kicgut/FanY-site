#!/bin/bash
# ============================================
# frp Server Setup Script (run on ECS)
# Usage: bash setup-frps.sh
# ============================================

set -e

FRP_VERSION="0.61.1"
INSTALL_DIR="/opt/frp"

echo "=== frp Server Setup ==="

# Create directory
mkdir -p "$INSTALL_DIR"

# Download frp
echo "[1/4] Downloading frp v${FRP_VERSION}..."
cd /tmp
curl -sL "https://github.com/fatedier/frp/releases/download/v${FRP_VERSION}/frp_${FRP_VERSION}_linux_amd64.tar.gz" -o frp.tar.gz
tar -xzf frp.tar.gz
cp "frp_${FRP_VERSION}_linux_amd64/frps" "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/frps"
rm -rf frp.tar.gz "frp_${FRP_VERSION}_linux_amd64"

# Copy config
echo "[2/4] Installing config..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cp "$SCRIPT_DIR/../config/frp/frps.toml" "$INSTALL_DIR/frps.toml"

# Create systemd service
echo "[3/4] Creating systemd service..."
cat > /etc/systemd/system/frps.service <<EOF
[Unit]
Description=frp server
After=network.target

[Service]
Type=simple
ExecStart=${INSTALL_DIR}/frps -c ${INSTALL_DIR}/frps.toml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Start service
echo "[4/4] Starting frp server..."
systemctl daemon-reload
systemctl enable frps
systemctl start frps

echo ""
echo "=== frp Server Setup Complete ==="
echo "Bind port: 7000"
echo "Dashboard: http://YOUR_IP:7500"
echo ""
echo "Remember to open ports in Alibaba Cloud Security Group:"
echo "  - 7000 (frp bind)"
echo "  - 7500 (dashboard)"
echo "  - 6000 (SSH tunnel)"
echo "  - 8080 (web tunnel)"
echo ""
echo "Next: install frpc on your local machine"
