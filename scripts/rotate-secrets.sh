#!/usr/bin/env bash
# Secret-Rotation-Helper fuer nachbar-io (Vercel-Env-Update).
#
# Nutzung:
#   bash scripts/rotate-secrets.sh            # Dry-Run (nichts wird geschrieben)
#   bash scripts/rotate-secrets.sh --execute  # Real-Mode
#
# Ablauf pro Key:
#   1. Skript zeigt Dashboard-URL + Key-Namen.
#   2. Du rotierst den Key im Dashboard (Neuen Wert erzeugen lassen).
#   3. Du pastest den neuen Wert ins Terminal (Eingabe ist unsichtbar).
#   4. Skript pusht den Wert in Vercel-Envs (production, preview, development) als --sensitive.
#
# Sicherheits-Zusicherungen:
#   - Wert wird via read -s eingelesen (Terminal-Echo off).
#   - Wert geht als stdin an vercel env add (nicht als argv → keine ps-aux-Leak).
#   - Bash-Variable wird am Funktions-Ende auf "" gesetzt + unset.
#   - Skript schreibt in KEIN lokales File. .env.cloud.local synchronisierst du manuell
#     via `vercel env pull` am Ende (Hinweis wird ausgegeben).
#
# Voraussetzungen:
#   - `vercel whoami` ist eingeloggt als thomasth1977
#   - Skript laeuft im nachbar-io/ Projekt-Root (package.json check greift)

set -euo pipefail

ENVIRONMENTS=(production preview development)
DRY_RUN=true
if [[ "${1:-}" == "--execute" ]]; then
  DRY_RUN=false
fi

# ---- Sanity-Checks ----

if [ ! -f "package.json" ] || ! grep -q '"name": "nachbar-io"' package.json; then
  echo "FEHLER: Skript muss im nachbar-io/ Projekt-Root laufen."
  exit 1
fi

if ! command -v vercel >/dev/null 2>&1; then
  echo "FEHLER: vercel CLI nicht gefunden."
  exit 1
fi

if ! vercel whoami >/dev/null 2>&1; then
  echo "FEHLER: vercel CLI nicht eingeloggt. Erst: vercel login"
  exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  Secret-Rotation nachbar-io"
echo "  Angemeldet als: $(vercel whoami 2>&1 | tail -1)"
if [ "$DRY_RUN" = true ]; then
  echo "  Modus: DRY-RUN  (kein Vercel-Write)"
else
  echo "  Modus: EXECUTE  (echter Vercel-Write)"
fi
echo "════════════════════════════════════════════════════════════════"

# ---- Helper-Funktionen ----

# rotate_manual NAME DASHBOARD_URL BESCHREIBUNG [--public]
# --public: Variable NICHT als --sensitive setzen (fuer NEXT_PUBLIC_*)
rotate_manual() {
  local name="$1"
  local dashboard="$2"
  local desc="$3"
  local public_flag="${4:-}"
  local sensitive_arg="--sensitive"
  if [[ "$public_flag" == "--public" ]]; then
    sensitive_arg=""
  fi

  echo ""
  echo "────────────────────────────────────────────────────────────────"
  echo "  $name"
  echo "  Zweck:     $desc"
  echo "  Dashboard: $dashboard"
  echo "────────────────────────────────────────────────────────────────"
  local ack
  read -r -p "  Rotation im Dashboard erledigt und neuer Wert bereit? (y/skip): " ack || true
  if [[ "${ack:-}" != "y" ]]; then
    echo "  → uebersprungen"
    return 0
  fi
  echo -n "  Neuer Wert (nicht sichtbar, Enter zum bestaetigen): "
  local value=""
  read -r -s value || true
  echo ""
  if [ -z "$value" ]; then
    echo "  Leer, uebersprungen"
    return 0
  fi
  local env
  for env in "${ENVIRONMENTS[@]}"; do
    if [ "$DRY_RUN" = true ]; then
      echo "  [dry-run] Wuerde $name in $env setzen ($([[ -n "$sensitive_arg" ]] && echo 'sensitive' || echo 'plain'))"
    else
      vercel env rm "$name" "$env" --yes >/dev/null 2>&1 || true
      if printf "%s" "$value" | vercel env add "$name" "$env" $sensitive_arg >/dev/null 2>&1; then
        echo "  ✓ $name in $env gesetzt"
      else
        echo "  ✗ FEHLER bei $name in $env"
      fi
    fi
  done
  value=""
  unset value
}

# rotate_auto NAME GEN_CMD BESCHREIBUNG
rotate_auto() {
  local name="$1"
  local gen_cmd="$2"
  local desc="$3"

  echo ""
  echo "────────────────────────────────────────────────────────────────"
  echo "  $name  (auto-generate)"
  echo "  Zweck:    $desc"
  echo "────────────────────────────────────────────────────────────────"
  local ack
  read -r -p "  Auto-rotieren? (y/skip): " ack || true
  if [[ "${ack:-}" != "y" ]]; then
    echo "  → uebersprungen"
    return 0
  fi
  local value
  value="$(eval "$gen_cmd")"
  if [ -z "$value" ]; then
    echo "  ✗ Generation fehlgeschlagen"
    return 0
  fi
  local env
  for env in "${ENVIRONMENTS[@]}"; do
    if [ "$DRY_RUN" = true ]; then
      echo "  [dry-run] Wuerde $name in $env setzen (sensitive)"
    else
      vercel env rm "$name" "$env" --yes >/dev/null 2>&1 || true
      if printf "%s" "$value" | vercel env add "$name" "$env" --sensitive >/dev/null 2>&1; then
        echo "  ✓ $name in $env gesetzt (auto-generated)"
      else
        echo "  ✗ FEHLER bei $name in $env"
      fi
    fi
  done
  value=""
  unset value
}

# VAPID-Paar Spezialfall (beide Keys aus einem Generate-Call, Public-Key nicht sensitive)
rotate_vapid_pair() {
  echo ""
  echo "────────────────────────────────────────────────────────────────"
  echo "  VAPID_PRIVATE_KEY + NEXT_PUBLIC_VAPID_PUBLIC_KEY (Paar)"
  echo "  WARNUNG: Alle bestehenden Web-Push-Subscriptions werden ungueltig."
  echo "  Bei aktuell 0 realen Nutzern unkritisch."
  echo "────────────────────────────────────────────────────────────────"
  local ack
  read -r -p "  Auto-rotieren? (y/skip): " ack || true
  if [[ "${ack:-}" != "y" ]]; then
    echo "  → uebersprungen"
    return 0
  fi
  local vapid_json private_key public_key
  vapid_json="$(npx --yes web-push generate-vapid-keys --json 2>/dev/null || true)"
  if [ -z "$vapid_json" ]; then
    echo "  ✗ web-push generate-vapid-keys fehlgeschlagen (npx web-push noetig)"
    return 0
  fi
  private_key="$(printf "%s" "$vapid_json" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{console.log(JSON.parse(d).privateKey)}catch(e){}})')"
  public_key="$(printf "%s" "$vapid_json" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{console.log(JSON.parse(d).publicKey)}catch(e){}})')"
  if [ -z "$private_key" ] || [ -z "$public_key" ]; then
    echo "  ✗ Konnte Key-Paar nicht parsen"
    return 0
  fi
  local env
  for env in "${ENVIRONMENTS[@]}"; do
    if [ "$DRY_RUN" = true ]; then
      echo "  [dry-run] Wuerde VAPID_PRIVATE_KEY (sensitive) + NEXT_PUBLIC_VAPID_PUBLIC_KEY (plain) in $env setzen"
    else
      vercel env rm "VAPID_PRIVATE_KEY" "$env" --yes >/dev/null 2>&1 || true
      printf "%s" "$private_key" | vercel env add "VAPID_PRIVATE_KEY" "$env" --sensitive >/dev/null 2>&1 \
        && echo "  ✓ VAPID_PRIVATE_KEY in $env gesetzt (sensitive)" \
        || echo "  ✗ FEHLER VAPID_PRIVATE_KEY in $env"
      vercel env rm "NEXT_PUBLIC_VAPID_PUBLIC_KEY" "$env" --yes >/dev/null 2>&1 || true
      printf "%s" "$public_key" | vercel env add "NEXT_PUBLIC_VAPID_PUBLIC_KEY" "$env" >/dev/null 2>&1 \
        && echo "  ✓ NEXT_PUBLIC_VAPID_PUBLIC_KEY in $env gesetzt (plain, per Design public)" \
        || echo "  ✗ FEHLER NEXT_PUBLIC_VAPID_PUBLIC_KEY in $env"
    fi
  done
  vapid_json=""; private_key=""; public_key=""
  unset vapid_json private_key public_key
}

# ---- P0 ----
echo ""
echo ""
echo "██████████  P0 — History-exposed  ██████████"
rotate_manual "RESEND_API_KEY"             "https://resend.com/api-keys"                                                           "E-Mail-Versand (Magic Link, Notifications)"
rotate_manual "NEXT_PUBLIC_TURN_CREDENTIAL" "https://dashboard.metered.ca/"                                                         "TURN-Relay Credential (Paar-Wert)"                 --public
rotate_manual "NEXT_PUBLIC_TURN_USERNAME"   "https://dashboard.metered.ca/"                                                         "TURN-Relay Username (Paar-Wert)"                   --public

# ---- P1 ----
echo ""
echo ""
echo "██████████  P1 — Session-exposed  ██████████"
rotate_manual "SUPABASE_SERVICE_ROLE_KEY" "https://supabase.com/dashboard/project/uylszchlyhbpbmslcnka/settings/api" "Supabase Service-Role (RLS-Bypass, DB-Admin)"
rotate_manual "ANTHROPIC_API_KEY"         "https://console.anthropic.com/settings/keys"                              "Claude-API"
rotate_manual "OPENAI_API_KEY"            "https://platform.openai.com/api-keys"                                     "OpenAI (TTS + GPT)"
rotate_manual "GOOGLE_AI_API_KEY"         "https://aistudio.google.com/app/apikey"                                   "Gemini-API"
rotate_manual "TAVILY_API_KEY"            "https://app.tavily.com/home"                                              "Tavily Web-Search"
rotate_manual "TWILIO_AUTH_TOKEN"         "https://console.twilio.com/"                                              "Twilio Auth-Token (SMS)"
rotate_manual "KV_REST_API_TOKEN"         "https://console.upstash.com/"                                             "Upstash KV/Redis REST Token"
rotate_manual "REDIS_URL"                 "https://console.upstash.com/"                                             "Upstash Redis URL (enthaelt neuen Token)"
rotate_manual "STRIPE_SECRET_KEY"         "https://dashboard.stripe.com/test/apikeys"                                "Stripe Test-Mode Secret"
rotate_manual "STRIPE_WEBHOOK_SECRET"     "https://dashboard.stripe.com/test/webhooks"                               "Stripe Webhook Signing-Secret"

# ---- P2 ----
echo ""
echo ""
echo "██████████  P2 — Auto-generate (kein Dashboard)  ██████████"
rotate_auto "CRON_SECRET"         "openssl rand -hex 32" "Cron-Endpoint-Auth"
rotate_auto "INTERNAL_API_SECRET" "openssl rand -hex 32" "Interne API-Endpoint-Auth"
rotate_vapid_pair

# ---- Abschluss ----
echo ""
echo ""
echo "████████████████████████████████████████████████████████████████"
echo "  FERTIG"
echo "████████████████████████████████████████████████████████████████"
if [ "$DRY_RUN" = true ]; then
  echo ""
  echo "DRY-RUN abgeschlossen. Kein Vercel-Write erfolgt."
  echo "Zum echten Lauf:  bash scripts/rotate-secrets.sh --execute"
else
  echo ""
  echo "Vercel-Envs wurden aktualisiert."
  echo ""
  echo "Naechste Schritte:"
  echo "  1. .env.cloud.local aktualisieren (OPTIONAL, je nach Workflow):"
  echo "       vercel env pull .env.cloud.local --yes --environment=production"
  echo "     (Dies UEBERSCHREIBT die Datei — bestehende manuelle Zeilen gehen verloren!)"
  echo ""
  echo "  2. Prod-Smoke-Test:"
  echo "       a) Login auf nachbar-io.vercel.app"
  echo "       b) Irgendein Feature-Endpoint triggern (z.B. Care-Dashboard laden)"
  echo ""
  echo "  3. Rotation-Checkliste abhaken:"
  echo "       docs/plans/2026-04-20-secret-rotation-checklist.md"
  echo ""
  echo "  4. Fuer nachbar-arzt / nachbar-civic / nachbar-pflege ggf. analog wiederholen"
  echo "     (falls die Projekte die gleichen Provider-Keys teilen — Supabase/Stripe/Resend ja)."
fi
echo ""
