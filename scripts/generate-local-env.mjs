#!/usr/bin/env node
// Schreibt eine frische .env.local fuer den LOKAL-Modus.
// Alle Secrets werden lokal generiert und NUR in die Datei geschrieben.
// Keine Ausgabe von Secret-Werten auf stdout.
//
// Nutzung:
//   node scripts/generate-local-env.mjs           # schreibt .env.local (abbricht wenn existiert)
//   node scripts/generate-local-env.mjs --force   # ueberschreibt

import { randomBytes } from "crypto";
import { writeFileSync, existsSync } from "fs";
import { resolve } from "path";

const force = process.argv.includes("--force");
const target = resolve(process.cwd(), ".env.local");

if (existsSync(target) && !force) {
  console.error(
    "[generate-local-env] .env.local existiert bereits. Mit --force ueberschreiben."
  );
  process.exit(1);
}

const hex = () => randomBytes(32).toString("hex");
const urlSafe = () => randomBytes(32).toString("base64url");

// Standard-Supabase-CLI-Demo-JWT-Keys (public, in allen lokalen Stacks gleich).
// Siehe: https://supabase.com/docs/guides/local-development/overview
const SUPABASE_DEMO_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SUPABASE_DEMO_SERVICE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const content = `# ============================================================
# nachbar-io — LOKALER Dev-Modus (generiert von scripts/generate-local-env.mjs)
# Regenerieren mit: node scripts/generate-local-env.mjs --force
# ============================================================
#
# Grundsatz: Diese Datei enthaelt AUSSCHLIESSLICH Werte die fuer
# lokale Entwicklung bestimmt sind. KEINE Prod-Secrets. Siehe
# .env.cloud.local fuer Cloud-Mode Secrets.
#
# API URL:  http://127.0.0.1:54421
# DB URL:   postgresql://postgres:postgres@127.0.0.1:54422/postgres
# Studio:   http://127.0.0.1:54423
# Inbucket: http://127.0.0.1:54424
# ============================================================

# --- Supabase LOKAL (CLI Demo-JWT-Keys, oeffentlich) ---
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54421
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_DEMO_ANON}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_DEMO_SERVICE}

# --- Site / App ---
NEXT_PUBLIC_SITE_URL=http://localhost:3000
PILOT_MODE=true
PILOT_AUTO_VERIFY=true
NEXT_PUBLIC_UX_REDESIGN_NAV=true
AI_PROVIDER=mock
ADMIN_EMAIL=dev@localhost

# --- Encryption (LOKAL-ONLY, frisch generiert — NIEMALS identisch zu Prod!) ---
CARE_ENCRYPTION_KEY=${hex()}
CIVIC_ENCRYPTION_KEY=${hex()}
RESIDENT_HASH_SECRET=${hex()}

# --- Secrets (LOKAL-ONLY) ---
CRON_SECRET=${urlSafe()}
INTERNAL_API_SECRET=${urlSafe()}
E2E_TEST_SECRET=e2e-test-secret-dev
SECURITY_E2E_BYPASS=e2e-test-secret-dev

# --- AI Providers (LOKAL: AI_PROVIDER=mock → keine echten Calls) ---
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash-lite
TAVILY_API_KEY=

# --- Email (lokal: Supabase Inbucket auf 127.0.0.1:54424) ---
RESEND_API_KEY=

# --- SMS (lokal: kein Versand) ---
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# --- Push (fuer lokales Testen: npx web-push generate-vapid-keys, dann hier einfuegen) ---
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

# --- KV / Redis (lokal: leer → Features mit Rate-Limit fallen ggf. durch) ---
KV_REST_API_URL=
KV_REST_API_TOKEN=
KV_REST_API_READ_ONLY_TOKEN=
KV_URL=
REDIS_URL=

# --- TURN Server (lokal: leer → WebRTC ohne TURN-Relay) ---
NEXT_PUBLIC_TURN_URL=
NEXT_PUBLIC_TURN_USERNAME=
NEXT_PUBLIC_TURN_CREDENTIAL=

# --- Stripe (lokal: leer — Billing-Endpoints brauchen eigenen Test-Account) ---
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PLUS_MONTHLY=
STRIPE_PRICE_PLUS_YEARLY=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_PRO_YEARLY=
STRIPE_HILFE_PRICE_ID=

# --- Monitoring (lokal aus) ---
NEXT_PUBLIC_SENTRY_DSN=

# --- Maps (public key, optional fuer Leaflet — eigenen Test-Key generieren wenn benoetigt) ---
NEXT_PUBLIC_MAPTILER_KEY=
`;

writeFileSync(target, content);
console.log("[generate-local-env] .env.local geschrieben (Secrets nicht ausgegeben).");
