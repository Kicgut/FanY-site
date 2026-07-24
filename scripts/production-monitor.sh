#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://127.0.0.1:3000}
ALERT_WEBHOOK_URL=${ALERT_WEBHOOK_URL:-}
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

if output=$(BASE_URL="$BASE_URL" "$SCRIPT_DIR/production-smoke.sh" 2>&1); then
  echo "$output"
  exit 0
fi

echo "$output" >&2
if [[ -n "$ALERT_WEBHOOK_URL" ]]; then
  payload=$(printf '{"text":"FanY production smoke failed\\n%s"}' "${output//"/\\\"}")
  curl -fsS --max-time 10 -H 'Content-Type: application/json' -d "$payload" "$ALERT_WEBHOOK_URL" >/dev/null || echo 'warning: alert webhook failed' >&2
fi
exit 1
