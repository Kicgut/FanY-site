#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://127.0.0.1:3000}
BASE_URL=${BASE_URL%/}

request_status() {
  curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$@"
}

assert_status() {
  local expected="$1"; shift
  local actual
  actual=$(request_status "$@")
  [[ "$actual" == "$expected" ]] || { echo "FAIL expected=$expected actual=$actual args=$*" >&2; exit 1; }
  echo "PASS $expected $*"
}

assert_status 200 "$BASE_URL/"
assert_status 200 "$BASE_URL/admin/security"
assert_status 200 "$BASE_URL/admin/jobs"
assert_status 401 "$BASE_URL/api/auth/me"
assert_status 401 "$BASE_URL/api/auth/2fa/setup" -X POST
assert_status 401 "$BASE_URL/api/auth/2fa/recovery-codes" -X POST
assert_status 401 "$BASE_URL/api/admin/content-pipeline/jobs"
assert_status 401 "$BASE_URL/api/admin/storage/consistency"
assert_status 401 "$BASE_URL/api/admin/storage/thumbnails/rebuild" -X POST

if command -v docker >/dev/null 2>&1 && docker inspect personal-website >/dev/null 2>&1; then
  health=$(docker inspect -f '{{.State.Health.Status}}' personal-website)
  [[ "$health" == healthy ]] || { echo "FAIL container health=$health" >&2; exit 1; }
  echo "PASS container health=healthy"
fi

echo "production smoke passed: $BASE_URL"
