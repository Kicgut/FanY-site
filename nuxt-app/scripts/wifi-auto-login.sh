#!/usr/bin/env bash
set -u

# Campus Wi-Fi Dr.COM auto-login watchdog.
# Credentials are read from /etc/default/wifi-auto-login (mode 600).

CONFIG_FILE="${WIFI_AUTO_LOGIN_CONFIG:-/etc/default/wifi-auto-login}"
LOG_FILE="${WIFI_AUTO_LOGIN_LOG:-/var/log/wifi-auto-login.log}"
LOCK_FILE="/run/lock/wifi-auto-login.lock"
IFACE="${WIFI_AUTO_LOGIN_IFACE:-wlp2s0}"
PORTAL_HOST="${WIFI_AUTO_LOGIN_PORTAL_HOST:-172.21.0.54}"
CHECK_URL="${WIFI_AUTO_LOGIN_CHECK_URL:-https://www.gstatic.com/generate_204}"
CHECK_HOST="${WIFI_AUTO_LOGIN_CHECK_HOST:-223.5.5.5}"
INTERVAL="${WIFI_AUTO_LOGIN_INTERVAL:-30}"

mkdir -p "$(dirname "$LOG_FILE")" "$(dirname "$LOCK_FILE")"
exec 9>"$LOCK_FILE"
flock -n 9 || exit 0

if [[ -r "$CONFIG_FILE" ]]; then
  # shellcheck disable=SC1090
  . "$CONFIG_FILE"
else
  echo "$(date -Is) missing credentials file: $CONFIG_FILE" >>"$LOG_FILE"
  exit 1
fi

log() { printf '%s %s\n' "$(date -Is)" "$*" >>"$LOG_FILE"; }

network_ok() {
  # Campus networks may block public HTTPS probes even after authentication.
  # Use the original campus-reachable DNS IP first, then HTTP/HTTPS fallback.
  ping -c 1 -W 3 "$CHECK_HOST" >/dev/null 2>&1 && return 0
  curl -fsS -m 8 -o /dev/null "$CHECK_URL" 2>/dev/null && return 0
  curl -fsS -m 8 -o /dev/null http://connectivitycheck.gstatic.com/generate_204 2>/dev/null
}

wifi_connected() {
  nmcli -t -f GENERAL.STATE dev show "$IFACE" 2>/dev/null | grep -q '^GENERAL.STATE:100'
}

ensure_wifi() {
  wifi_connected && return 0
  log "wifi interface is disconnected; requesting TJ-DORM-WIFI reconnect"
  timeout 15 nmcli connection up id "${WIFI_AUTO_LOGIN_CONNECTION:-TJ-DORM-WIFI}" ifname "$IFACE" >/dev/null 2>&1 || true
  sleep 5
  wifi_connected
}

login_once() {
  local body code endpoint
  # Some campus gateways expose the legacy endpoint on port 80, while 801 may
  # be the EPortal administration SPA. Try both and reject the SPA response.
  for endpoint in \
    "http://${PORTAL_HOST}/eportal/?c=ACSetting&a=Login" \
    "http://${PORTAL_HOST}:801/eportal/?c=ACSetting&a=Login"; do
    body=$(mktemp)
    code=$(curl -sS -m 10 -o "$body" -w '%{http_code}' -X POST "$endpoint" \
      --data-urlencode "DDDDD=${USERNAME}" \
      --data-urlencode "upass=${PASSWORD}" \
      --data-urlencode 'url=drappal' -d '0MKKey=123456' 2>/dev/null || true)
    if grep -aqiE 'EPortal|chunk-libs|id=app' "$body"; then
      rm -f "$body"
      continue
    fi
    # Dr.COM returns GBK HTML; -a is required because some responses contain
    # non-text bytes. The success page has a stable ASCII marker.
    if [[ "$code" == 2* ]] && grep -aqiE 'success|成功|已经|已登录|login_ok|result[^0-9]*1|Dr.COMWebLoginID_3' "$body"; then
      rm -f "$body"
      log "login accepted via ${endpoint} (HTTP ${code})"
      return 0
    fi
    # This gateway sometimes answers a valid login/renewal with HTTP 203 and
    # a GBK page whose text is not stable. Network verification below is the
    # authoritative result, so accept any non-SPA 2xx response as submitted.
    if [[ "$code" == 2* ]]; then
      rm -f "$body"
      log "login request submitted via ${endpoint} (HTTP ${code}); verifying connectivity"
      return 0
    fi
    log "login rejected via ${endpoint} (HTTP ${code})"
    rm -f "$body"
  done
  return 1
}

run_once() {
  ensure_wifi || { log "wifi interface is not connected"; return 1; }
  network_ok && return 0
  log "network requires portal login"
  login_once || return 1
  sleep 3
  network_ok && log "network restored" || { log "login completed but network is still unavailable"; return 1; }
}

log "watchdog started"
while :; do
  run_once || true
  sleep "$INTERVAL"
done
