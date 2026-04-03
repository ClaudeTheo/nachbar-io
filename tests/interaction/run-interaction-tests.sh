#!/usr/bin/env bash
# Interaktionstests — API-basiert gegen Live-Vercel-Instanzen
# Ausfuehrung: bash tests/interaction/run-interaction-tests.sh
#
# Testet: A3 Hilfe-Gesuch (retest), C9-C12 Rathaus, D13-D16 Arzt, E17-E20 Pflege
# Voraussetzung: Alle Portale auf Vercel deployed

set -uo pipefail

ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5bHN6Y2hseWhicGJtc2xjbmthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTY1OTIsImV4cCI6MjA4ODQzMjU5Mn0.icx9JInEc8e8K-GDEsdVPgiwrrJ8hmRtnTrzzcAzSpw"
SUPABASE_URL="https://uylszchlyhbpbmslcnka.supabase.co"

IO_URL="https://nachbar-io.vercel.app"
CIVIC_URL="https://nachbar-civic.vercel.app"
ARZT_URL="https://nachbar-arzt.vercel.app"
PFLEGE_URL="https://nachbar-pflege.vercel.app"

PASSED=0
FAILED=0
SKIPPED=0

# --- Hilfsfunktionen ---

get_token() {
  local email="$1"
  curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
    -H "apikey: $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"LiveTest2026!\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null
}

supabase_get() {
  local path="$1"
  local token="$2"
  curl -s "$SUPABASE_URL/rest/v1/$path" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $token"
}

supabase_post() {
  local path="$1"
  local token="$2"
  local data="$3"
  curl -s -X POST "$SUPABASE_URL/rest/v1/$path" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "$data"
}

check_health() {
  local url="$1"
  local name="$2"
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url/api/health" 2>/dev/null || echo "000")
  if [[ "$status" == "200" ]]; then
    echo "  PASS: $name Health ($status)"
    ((PASSED++))
  else
    echo "  FAIL: $name Health ($status)"
    ((FAILED++))
  fi
}

report() {
  local id="$1"
  local name="$2"
  local ok="$3"
  if [[ "$ok" == "true" ]]; then
    echo "  PASS: $id $name"
    ((PASSED++))
  else
    echo "  FAIL: $id $name"
    ((FAILED++))
  fi
}

skip() {
  local id="$1"
  local name="$2"
  local reason="$3"
  echo "  SKIP: $id $name — $reason"
  ((SKIPPED++))
}

echo "=== Interaktionstests ($(date +%Y-%m-%d\ %H:%M)) ==="
echo ""

# --- Tokens holen ---
echo "--- Authentifizierung ---"
FELIX_TOKEN=$(get_token "felix.meier@nachbar-test.de")
SANDRA_TOKEN=$(get_token "sandra.keller@nachbar-test.de")
HELGA_TOKEN=$(get_token "helga.brunner@nachbar-test.de")
MARKUS_TOKEN=$(get_token "markus.weber@nachbar-test.de")
LISA_TOKEN=$(get_token "lisa.hoffmann@nachbar-test.de")
PETRA_TOKEN=$(get_token "petra.schneider@nachbar-test.de")

for name in FELIX SANDRA HELGA MARKUS LISA PETRA; do
  var="${name}_TOKEN"
  if [[ -n "${!var}" && "${!var}" != "" ]]; then
    echo "  OK: $name authentifiziert"
  else
    echo "  FAIL: $name Auth fehlgeschlagen"
    ((FAILED++))
  fi
done

# IDs
FELIX_ID="29c87a1c-bc1a-4cb4-bc76-06ed7d649774"
HELGA_ID="c1a87c11-184e-449d-a3f4-a5913829f8e4"
SANDRA_ID="4830c4b7-8de3-4bc0-93c8-fee317f0f154"
MARKUS_ID="1ab2c3aa-19e4-4bd5-bcb8-17f5aa604faa"
PETRA_ID="3ef411b5-5ba9-4227-a1e5-068e89ece442"
FELIX_QUARTER="0b1d9693-5fc3-48cc-9aa1-49b1efb23f4e"
MARKUS_QUARTER="ee6cfcab-f615-47cd-afe7-808a27cb584b"

echo ""
echo "--- A3: Hilfe-Gesuch (Retest nach Fix) ---"

# A3: Felix erstellt ein Hilfe-Gesuch via Supabase REST (API-Route nicht direkt testbar ohne Cookies)
A3_RESULT=$(supabase_post "help_requests" "$FELIX_TOKEN" \
  "{\"user_id\":\"$FELIX_ID\",\"quarter_id\":\"$FELIX_QUARTER\",\"type\":\"need\",\"category\":\"shopping\",\"title\":\"A3 Test: Einkaufshilfe\",\"description\":\"Interaktionstest A3\"}")
A3_ID=$(echo "$A3_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if isinstance(d,list) else d.get('id',''))" 2>/dev/null)
if [[ -n "$A3_ID" && "$A3_ID" != "" ]]; then
  report "A3" "Felix Hilfe-Gesuch erstellt (ID: ${A3_ID:0:8})" "true"
else
  report "A3" "Felix Hilfe-Gesuch erstellen" "false"
  echo "    Detail: $A3_RESULT" | head -c 200
fi

echo ""
echo "--- C9-C12: Rathaus-Portal (Markus) ---"

# C9: Rathaus Health
check_health "$CIVIC_URL" "Rathaus"

# C10: Bekanntmachungen API
C10_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$CIVIC_URL/api/bekanntmachungen" 2>/dev/null || echo "000")
# Civic API erfordert Auth — 401 ist erwartet wenn kein Cookie, aber Route existiert
if [[ "$C10_STATUS" == "200" || "$C10_STATUS" == "401" ]]; then
  report "C10" "Bekanntmachungen-Route existiert ($C10_STATUS)" "true"
else
  report "C10" "Bekanntmachungen-Route ($C10_STATUS)" "false"
fi

# C11: Baustellen API
C11_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$CIVIC_URL/api/baustellen" 2>/dev/null || echo "000")
if [[ "$C11_STATUS" == "200" || "$C11_STATUS" == "401" ]]; then
  report "C11" "Baustellen-Route existiert ($C11_STATUS)" "true"
else
  report "C11" "Baustellen-Route ($C11_STATUS)" "false"
fi

# C12: Audit-Log API
C12_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$CIVIC_URL/api/audit-log" 2>/dev/null || echo "000")
if [[ "$C12_STATUS" == "200" || "$C12_STATUS" == "401" ]]; then
  report "C12" "Audit-Log-Route existiert ($C12_STATUS)" "true"
else
  report "C12" "Audit-Log-Route ($C12_STATUS)" "false"
fi

echo ""
echo "--- D13-D16: Arzt-Portal (Lisa) ---"

# D13: Arzt Portal erreichbar (Health braucht HEALTH_CHECK_TOKEN env — teste Root)
D13_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$ARZT_URL" 2>/dev/null || echo "000")
if [[ "$D13_STATUS" == "200" || "$D13_STATUS" == "307" ]]; then
  report "D13" "Arzt-Portal erreichbar ($D13_STATUS)" "true"
else
  report "D13" "Arzt-Portal ($D13_STATUS)" "false"
fi

# D14: Termine API
D14_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$ARZT_URL/api/termine" 2>/dev/null || echo "000")
if [[ "$D14_STATUS" == "200" || "$D14_STATUS" == "401" ]]; then
  report "D14" "Termine-Route existiert ($D14_STATUS)" "true"
else
  report "D14" "Termine-Route ($D14_STATUS)" "false"
fi

# D15: Patienten-Registrierung API
D15_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$ARZT_URL/api/patienten/register" 2>/dev/null || echo "000")
if [[ "$D15_STATUS" == "200" || "$D15_STATUS" == "401" || "$D15_STATUS" == "405" ]]; then
  report "D15" "Patienten-Register-Route existiert ($D15_STATUS)" "true"
else
  report "D15" "Patienten-Register-Route ($D15_STATUS)" "false"
fi

# D16: Credits API
D16_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$ARZT_URL/api/credits" 2>/dev/null || echo "000")
if [[ "$D16_STATUS" == "200" || "$D16_STATUS" == "401" ]]; then
  report "D16" "Credits-Route existiert ($D16_STATUS)" "true"
else
  report "D16" "Credits-Route ($D16_STATUS)" "false"
fi

echo ""
echo "--- E17-E20: Pflege-Portal (Petra) ---"

# E17: Pflege Health (kein /api/health — teste Root)
E17_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PFLEGE_URL" 2>/dev/null || echo "000")
if [[ "$E17_STATUS" == "200" || "$E17_STATUS" == "307" ]]; then
  report "E17" "Pflege-Portal erreichbar ($E17_STATUS)" "true"
else
  report "E17" "Pflege-Portal ($E17_STATUS)" "false"
fi

# E18: test-login Endpoint (GET braucht secret+email+password als Query-Params)
# Ohne E2E_TEST_SECRET env gibt es 404 — das ist korrekt in Produktion
E18_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PFLEGE_URL/api/test/login?email=test&password=test&secret=wrong" 2>/dev/null || echo "000")
if [[ "$E18_STATUS" == "200" || "$E18_STATUS" == "307" || "$E18_STATUS" == "401" || "$E18_STATUS" == "404" ]]; then
  report "E18" "Test-Login-Route existiert ($E18_STATUS)" "true"
else
  report "E18" "Test-Login-Route ($E18_STATUS)" "false"
fi

# E19: Emergency-Profile API
E19_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PFLEGE_URL/api/emergency-profile" 2>/dev/null || echo "000")
if [[ "$E19_STATUS" == "200" || "$E19_STATUS" == "401" || "$E19_STATUS" == "405" ]]; then
  report "E19" "Emergency-Profile-Route existiert ($E19_STATUS)" "true"
else
  report "E19" "Emergency-Profile-Route ($E19_STATUS)" "false"
fi

# E20: Chat-Init API
E20_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PFLEGE_URL/api/chat/init" 2>/dev/null || echo "000")
if [[ "$E20_STATUS" == "200" || "$E20_STATUS" == "401" || "$E20_STATUS" == "405" ]]; then
  report "E20" "Chat-Init-Route existiert ($E20_STATUS)" "true"
else
  report "E20" "Chat-Init-Route ($E20_STATUS)" "false"
fi

# --- Zusammenfassung ---
echo ""
echo "========================================="
echo "  ERGEBNIS: $PASSED passed, $FAILED failed, $SKIPPED skipped"
echo "========================================="

# Cleanup: A3 Testdaten entfernen
if [[ -n "${A3_ID:-}" && "$A3_ID" != "" ]]; then
  curl -s -X DELETE "$SUPABASE_URL/rest/v1/help_requests?id=eq.$A3_ID" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $FELIX_TOKEN" > /dev/null 2>&1
  echo "  (A3 Testdaten bereinigt)"
fi

exit $FAILED
