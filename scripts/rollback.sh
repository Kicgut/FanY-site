#!/bin/bash
# ============================================
# Rollback Script - Revert to previous version
# Usage: bash rollback.sh [commit-hash]
# ============================================

set -e

PROJECT_DIR="/opt/personal-website/nuxt-app"
cd "$PROJECT_DIR"

echo "=== Rollback ==="

# Show recent commits
echo "Recent commits:"
git log --oneline -10
echo ""

if [ -n "$1" ]; then
  TARGET="$1"
else
  # Default: revert to previous commit
  TARGET="HEAD~1"
fi

echo "Rolling back to: $TARGET"
git checkout "$TARGET"

# Rebuild
echo "Rebuilding..."
docker compose build --no-cache

# Restart
echo "Restarting..."
docker compose up -d

echo ""
echo "✅ Rollback complete!"
echo "Current version: $(git log --oneline -1)"
echo ""
echo "To go back to latest: git checkout main && docker compose up -d --build"
