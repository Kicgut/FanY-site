#!/bin/sh
# Startup script: apply migrations, then start server
# Migrations are explicit release steps. Never silently mutate production
# schema with db push when a migration fails.

set -e

echo "Running prisma migrate deploy..."
if npx prisma migrate deploy 2>&1; then
  echo "Migrations applied successfully."
else
  echo "Migration deploy failed; refusing to start with an unverified schema." >&2
  exit 1
fi

exec node .output/server/index.mjs
