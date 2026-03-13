#!/bin/bash
# =============================================================================
# API Error Handling Test Script fuer Nachbar.io
# Testet alle API-Routen auf korrekte Fehlerbehandlung
#
# Verwendung: bash scripts/test-api-error-handling.sh [BASE_URL]
# Standard BASE_URL: http://localhost:3000
# =============================================================================

BASE_URL="${1:-http://localhost:3000}"
PASS=0
FAIL=0
WARN=0

# Farben fuer Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo "============================================="
echo "  Nachbar.io API Error Handling Tests"
echo "  Server: $BASE_URL"
echo "============================================="
echo ""

# Hilfsfunktion: API-Route testen
test_route() {
  local method="$1"
  local path="$2"
  local expected_status="$3"
  local description="$4"
  local data="$5"
  local extra_headers="$6"

  local url="${BASE_URL}${path}"
  local args=(-s -w '\n{"_http_status":%{http_code},"_content_type":"%{content_type}"}' -X "$method")

  if [ -n "$data" ]; then
    args+=(-H "Content-Type: application/json" -d "$data")
  fi

  if [ -n "$extra_headers" ]; then
    args+=(-H "$extra_headers")
  fi

  local raw_response
  raw_response=$(curl "${args[@]}" "$url" 2>&1)

  # HTTP-Status extrahieren (letzte Zeile ist unser Metadata-JSON)
  local http_status
  http_status=$(echo "$raw_response" | tail -1 | sed 's/.*"_http_status":\([0-9]*\).*/\1/')

  local content_type
  content_type=$(echo "$raw_response" | tail -1 | sed 's/.*"_content_type":"\([^"]*\)".*/\1/')

  # Response-Body (alles ausser der letzten Zeile)
  local body
  body=$(echo "$raw_response" | head -n -1)

  # JSON-Pruefung
  local is_json=false
  if echo "$content_type" | grep -q "application/json"; then
    is_json=true
  fi

  # Ergebnis pruefen
  local status_ok=false
  if [ "$http_status" = "$expected_status" ]; then
    status_ok=true
  fi

  # Ausgabe
  if $status_ok && $is_json; then
    echo -e "${GREEN}PASS${NC} [$method $path] -> $http_status (erwartet: $expected_status) | JSON: ja"
    echo "     $description"
    PASS=$((PASS + 1))
  elif $status_ok && ! $is_json; then
    echo -e "${YELLOW}WARN${NC} [$method $path] -> $http_status (erwartet: $expected_status) | JSON: NEIN ($content_type)"
    echo "     $description"
    echo "     Body (truncated): $(echo "$body" | head -c 200)"
    WARN=$((WARN + 1))
  else
    echo -e "${RED}FAIL${NC} [$method $path] -> $http_status (erwartet: $expected_status) | JSON: $is_json"
    echo "     $description"
    echo "     Body (truncated): $(echo "$body" | head -c 200)"
    FAIL=$((FAIL + 1))
  fi
  echo ""
}

echo -e "${CYAN}--- 1. Authentifizierungs-Tests (401 ohne Auth) ---${NC}"
echo ""

test_route "POST" "/api/alerts" "401" \
  "POST /api/alerts ohne Auth -> 401 Nicht authentifiziert" \
  '{"category":"noise","title":"Test"}'

test_route "GET" "/api/alerts" "401" \
  "GET /api/alerts ohne Auth -> 401 Nicht authentifiziert"

test_route "POST" "/api/push/subscribe" "401" \
  "POST /api/push/subscribe ohne Auth -> 401 Nicht authentifiziert" \
  '{"endpoint":"https://example.com","keys":{"p256dh":"x","auth":"y"}}'

test_route "DELETE" "/api/push/subscribe" "401" \
  "DELETE /api/push/subscribe ohne Auth -> 401 Nicht authentifiziert" \
  '{"endpoint":"https://example.com"}'

test_route "POST" "/api/user/delete" "401" \
  "POST /api/user/delete ohne Auth -> 401 Nicht autorisiert" \
  '{"confirmText":"KONTO LOESCHEN"}'

test_route "POST" "/api/admin/create-user" "401" \
  "POST /api/admin/create-user ohne Auth -> 401 Nicht autorisiert" \
  '{"displayName":"Test","street":"Test","houseNumber":"1"}'

test_route "GET" "/api/admin/health" "401" \
  "GET /api/admin/health ohne Auth -> 401 Nicht autorisiert"

test_route "POST" "/api/admin/broadcast" "401" \
  "POST /api/admin/broadcast ohne Auth -> 401 Nicht autorisiert" \
  '{"title":"Test","body":"Test"}'

test_route "GET" "/api/admin/broadcast" "401" \
  "GET /api/admin/broadcast ohne Auth -> 401 Nicht autorisiert"

test_route "POST" "/api/invite/send" "401" \
  "POST /api/invite/send ohne Auth -> 401 Nicht autorisiert" \
  '{"street":"Test","houseNumber":"1","method":"code"}'

test_route "GET" "/api/user/export" "401" \
  "GET /api/user/export ohne Auth -> 401 Nicht autorisiert"

test_route "POST" "/api/news/aggregate" "401" \
  "POST /api/news/aggregate ohne Auth -> 401 Nicht autorisiert" \
  '{}'

test_route "GET" "/api/news/scrape" "401" \
  "GET /api/news/scrape ohne Auth -> 401 oder 500 (CRON_SECRET)"

test_route "GET" "/api/news/rss" "401" \
  "GET /api/news/rss ohne Auth -> 401 oder 500 (CRON_SECRET)"

echo ""
echo -e "${CYAN}--- 2. Validierungs-Tests (400 bei fehlenden Pflichtfeldern) ---${NC}"
echo ""

test_route "POST" "/api/register/complete" "400" \
  "POST /api/register/complete leerer Body -> 400 (displayName fehlt)" \
  '{}'

test_route "POST" "/api/register/complete" "400" \
  "POST /api/register/complete nur displayName -> 400 (email+password fehlen)" \
  '{"displayName":"Test"}'

test_route "GET" "/api/qr" "400" \
  "GET /api/qr ohne code-Param -> 400 (Parameter fehlt)"

test_route "GET" "/api/qr?code=!!invalid!!" "400" \
  "GET /api/qr ungueltiges Code-Format -> 400"

test_route "GET" "/api/qr?code=ABC123" "200" \
  "GET /api/qr gueltiger Code -> 200 SVG"

echo ""
echo -e "${CYAN}--- 3. Device-Auth-Tests (401 ohne Token) ---${NC}"
echo ""

test_route "GET" "/api/device/status" "401" \
  "GET /api/device/status ohne Token -> 401 Ungueltiges Token" \
  ""

test_route "POST" "/api/device/checkin" "401" \
  "POST /api/device/checkin ohne Token -> 401 Ungueltiges Token" \
  '{}'

test_route "POST" "/api/device/alert-ack" "400" \
  "POST /api/device/alert-ack ohne alertId -> 400" \
  '{}'

test_route "POST" "/api/device/alert-ack" "401" \
  "POST /api/device/alert-ack mit alertId ohne Token -> 401" \
  '{"alertId":"00000000-0000-0000-0000-000000000000"}'

echo ""
echo -e "${CYAN}--- 4. Push-Internal-Auth-Tests (403 ohne Secret) ---${NC}"
echo ""

test_route "POST" "/api/push/send" "403" \
  "POST /api/push/send ohne Internal-Secret -> 403 Nicht autorisiert" \
  '{"title":"Test"}'

test_route "POST" "/api/push/notify" "403" \
  "POST /api/push/notify ohne Internal-Secret/Auth -> 403" \
  '{"userId":"test","title":"Test"}'

echo ""
echo -e "${CYAN}--- 5. Nicht-existierende Routen (404) ---${NC}"
echo ""

test_route "POST" "/api/help/request" "404" \
  "POST /api/help/request (Route existiert nicht) -> 404"  \
  '{}'

test_route "POST" "/api/marketplace/create" "404" \
  "POST /api/marketplace/create (Route existiert nicht) -> 404" \
  '{}'

test_route "GET" "/api/news/feed" "404" \
  "GET /api/news/feed (Route existiert nicht) -> 404"

echo ""
echo -e "${CYAN}--- 6. Malformed-Body-Tests (robuste JSON-Parsing) ---${NC}"
echo ""

# Diese Tests pruefen ob Routen bei ungueltigem JSON nicht mit 500 abstuerzen
test_route "POST" "/api/alerts" "401" \
  "POST /api/alerts mit ungueltigem JSON -> 401 (Auth first, kein 500)" \
  'NOT_JSON'

test_route "POST" "/api/register/complete" "400" \
  "POST /api/register/complete mit ungueltigem JSON -> 400 oder 500" \
  'NOT_JSON'

echo ""
echo "============================================="
echo "  Ergebnis"
echo "============================================="
echo -e "  ${GREEN}PASS: $PASS${NC}"
echo -e "  ${YELLOW}WARN: $WARN${NC} (richtige Status, aber nicht JSON)"
echo -e "  ${RED}FAIL: $FAIL${NC} (falscher Status)"
echo ""
TOTAL=$((PASS + WARN + FAIL))
echo "  Gesamt: $TOTAL Tests"
echo "============================================="

# Exit-Code: 1 bei Fehlern
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
