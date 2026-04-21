#!/usr/bin/env bash
# Prod-Smoke-Test nach Secret-Rotation oder Deploy.
#
# Schneller Check dass die wichtigsten Oberflaechen noch reagieren. KEIN Login-Flow,
# KEIN Daten-Write — nur harmlose GETs auf Endpoints ohne Auth-Pflicht.
#
# Nutzung:
#   bash scripts/smoke-test-prod.sh
#
# Exit-Code:
#   0 = alle Checks gruen
#   1 = mindestens ein Check rot
#
# Wenn ein Test fehlschlaegt: Rotation-Rollback pruefen / Vercel-Deployment-Status ansehen /
# Logs via `vercel logs nachbar-io.vercel.app`.

set -uo pipefail

FAIL=0
RESULTS=()

check() {
  local name="$1"
  local url="$2"
  local expected_status="${3:-200}"
  local expected_body_match="${4:-}"

  local response
  response=$(curl -sSL -o /tmp/smoke-body -w "%{http_code}" --max-time 10 "$url" 2>&1 || echo "ERR")
  local status="$response"
  if [[ "$status" == "$expected_status" ]]; then
    if [ -n "$expected_body_match" ]; then
      if grep -q "$expected_body_match" /tmp/smoke-body 2>/dev/null; then
        RESULTS+=("  ✓ $name  [$status, body matches]")
      else
        RESULTS+=("  ✗ $name  [$status, but body missing '$expected_body_match']")
        FAIL=1
      fi
    else
      RESULTS+=("  ✓ $name  [$status]")
    fi
  else
    RESULTS+=("  ✗ $name  [got: $status, expected: $expected_status, url: $url]")
    FAIL=1
  fi
}

echo ""
echo "════════════════════════════════════════════════════"
echo "  Smoke-Test: nachbar-io Prod + nachbar-arzt Prod"
echo "  Startzeit: $(date '+%Y-%m-%d %H:%M:%S')"
echo "════════════════════════════════════════════════════"

# --- nachbar-io ---
check "nachbar-io homepage"              "https://nachbar-io.vercel.app/"            200
check "nachbar-io /api/health"           "https://nachbar-io.vercel.app/api/health"  200 "\"status\":\"ok\""
check "nachbar-io robots.txt"            "https://nachbar-io.vercel.app/robots.txt"  200
check "nachbar-io /datenschutz"          "https://nachbar-io.vercel.app/datenschutz" 200

# --- nachbar-arzt ---
check "nachbar-arzt homepage"            "https://nachbar-arzt.vercel.app/"          200

echo ""
printf '%s\n' "${RESULTS[@]}"
echo ""
echo "════════════════════════════════════════════════════"
if [ "$FAIL" -eq 0 ]; then
  echo "  ALLE CHECKS GRUEN"
  echo ""
  echo "  Zusatz-Manuell-Tests (Rotation-spezifisch):"
  echo "    - Magic-Link-Login: auf nachbar-io.vercel.app → Email → Klick → landet im Portal?"
  echo "      (testet: RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY)"
  echo "    - Stripe-Webhook: Stripe-Dashboard → Webhook-Endpoint → Test-Event senden"
  echo "      → /api/stripe/webhook sollte 200 zurueckgeben"
  echo "    - Cron-Job: Vercel → Project → Cron → manueller Trigger auf /api/cron/*"
  echo "      (testet: CRON_SECRET)"
  rm -f /tmp/smoke-body
  exit 0
else
  echo "  MINDESTENS EIN CHECK ROT"
  echo ""
  echo "  Naechste Schritte:"
  echo "    - vercel logs https://nachbar-io.vercel.app  (last 100 lines)"
  echo "    - Check dass Rotation-Werte in Vercel-Envs korrekt sind:"
  echo "      vercel env ls production | head -30"
  echo "    - Evtl. letztes Deployment neu triggern (auto-redeploy bei env-Aenderung sollte greifen)"
  rm -f /tmp/smoke-body
  exit 1
fi
