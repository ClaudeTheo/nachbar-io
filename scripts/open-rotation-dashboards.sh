#!/usr/bin/env bash
# Oeffnet alle Provider-Dashboards fuer die Secret-Rotation als Browser-Tabs.
#
# Nutzung:
#   bash scripts/open-rotation-dashboards.sh              # alle 11 Dashboards
#   bash scripts/open-rotation-dashboards.sh p0           # nur P0 (History-exposed)
#   bash scripts/open-rotation-dashboards.sh p1           # nur P1 (Session-exposed)
#   bash scripts/open-rotation-dashboards.sh vercel       # nur Vercel-Dashboard
#
# Nach dem Oeffnen:
#   Separates Terminal: `bash scripts/rotate-secrets.sh --execute`
#   Das Skript fragt pro Key, paste den Wert aus dem jeweiligen Tab.

set -euo pipefail

SCOPE="${1:-all}"

# Browser-Open-Befehl je nach OS
open_url() {
  local url="$1"
  if command -v start >/dev/null 2>&1; then
    start "" "$url" 2>/dev/null
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" 2>/dev/null
  elif command -v open >/dev/null 2>&1; then
    open "$url" 2>/dev/null
  else
    echo "  (manuell oeffnen: $url)"
  fi
}

# --- Vercel zuerst, weil da der Sensitive-Flag nach Rotation gesetzt wird ---
VERCEL_URLS=(
  "https://vercel.com/dashboard"
  "https://vercel.com/thomasth1977s-projects/nachbar-io/settings/environment-variables"
)

# --- P0: History-exposed ---
P0_URLS=(
  "https://resend.com/api-keys"
  "https://dashboard.metered.ca/"
)

# --- P1: Session-exposed ---
P1_URLS=(
  "https://supabase.com/dashboard/project/uylszchlyhbpbmslcnka/settings/api"
  "https://console.anthropic.com/settings/keys"
  "https://platform.openai.com/api-keys"
  "https://aistudio.google.com/app/apikey"
  "https://app.tavily.com/home"
  "https://console.twilio.com/"
  "https://console.upstash.com/"
  "https://dashboard.stripe.com/test/apikeys"
  "https://dashboard.stripe.com/test/webhooks"
)

case "$SCOPE" in
  vercel)
    echo "Oeffne nur Vercel-Dashboards..."
    for u in "${VERCEL_URLS[@]}"; do echo "  → $u"; open_url "$u"; sleep 0.3; done
    ;;
  p0)
    echo "Oeffne P0 (History-exposed)..."
    for u in "${P0_URLS[@]}"; do echo "  → $u"; open_url "$u"; sleep 0.3; done
    ;;
  p1)
    echo "Oeffne P1 (Session-exposed)..."
    for u in "${P1_URLS[@]}"; do echo "  → $u"; open_url "$u"; sleep 0.3; done
    ;;
  all|*)
    echo "Oeffne alle Rotation-Dashboards (Vercel + P0 + P1)..."
    echo ""
    echo "Vercel:"
    for u in "${VERCEL_URLS[@]}"; do echo "  → $u"; open_url "$u"; sleep 0.3; done
    echo ""
    echo "P0 (History-exposed, zuerst rotieren):"
    for u in "${P0_URLS[@]}"; do echo "  → $u"; open_url "$u"; sleep 0.3; done
    echo ""
    echo "P1 (Session-exposed):"
    for u in "${P1_URLS[@]}"; do echo "  → $u"; open_url "$u"; sleep 0.3; done
    ;;
esac

echo ""
echo "────────────────────────────────────────────────"
echo "Dashboards offen. Naechster Schritt im Terminal:"
echo ""
echo "  bash scripts/rotate-secrets.sh --execute"
echo ""
echo "Reihenfolge: VORHER Vercel-Dashboard → Account Settings → Activity (2 Min Check)."
echo "Wenn Activity-Log sauber: mit Rotation starten."
echo "────────────────────────────────────────────────"
