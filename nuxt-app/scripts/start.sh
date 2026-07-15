#!/bin/sh
# Startup script: apply migrations, then start server
# Uses prisma migrate deploy; if it fails, try db push as fallback

set -e

echo "Running prisma migrate deploy..."
if npx prisma migrate deploy 2>&1; then
  echo "Migrations applied successfully."
else
  echo "Migration deploy failed, trying db push..."
  npx prisma db push --accept-data-loss 2>&1 || true
  echo "Starting server..."
fi

exec node .output/server/index.mjs
