# Vercel-Baseline-Snapshot — 2026-04-21

**Zweck:** Teil-Ersatz / Vorab-Check fuer den Vercel-Activity-Log-Review aus der Secret-Rotation-Checkliste. Dashboard-Activity-Log (Logins aus fremden IPs, Env-Reads) ist **nicht** per CLI abrufbar — dafuer bleibt der Browser-Check zwingend (ca. 2 Min im Dashboard).

Dieser Snapshot deckt die **Struktur-Indikatoren** ab: unerwartete Projekte, Team-Mitglieder, Env-Var-Eintraege, fremde Deployer.

## Methodik

Alle Daten via `vercel` CLI 50.44.0 als `thomasth1977`. Nur Namen + Metadaten, keine Env-Werte gelesen.

## Befunde

### Team-Struktur: sauber

- **1 Team / Scope:** `thomasth1977's projects` (Solo)
- **Keine weiteren Mitglieder** (CLI zeigt nur den aktuellen User)

### Projekte (8): alle nachvollziehbar

| Projekt | Letzte URL | Letzter Update | Bewertung |
|---|---|---|---|
| `nachbar-io` | nachbar-io.vercel.app | 2d | ✅ Haupt-App, aktiv |
| `nahkreis-app` | nahkreis-app.vercel.app | 7d | ✅ Nahkreis-Projekt |
| `nachbar-arzt` | nachbar-arzt.vercel.app | 12d | ✅ Arzt-Portal |
| `nachbar-pflege` | nachbar-pflege.vercel.app | 14d | ✅ eingefroren |
| `nachbar-civic` | nachbar-civic.vercel.app | 14d | ✅ partiell ent-frost |
| `frontend` | frontend-topaz-ten-90.vercel.app | 15d | ⚠️ Generischer Name — Sanity-Check empfohlen |
| `nachbar-admin` | nachbar-admin.vercel.app | 15d | ✅ eingefroren |
| `annette` | annette-theobald.de | 15d | ✅ privates Projekt (Mandantin) |

**Frontend-Projekt: identifiziert als orphan**. HTTP-Check am 2026-04-21 (`curl https://frontend-topaz-ten-90.vercel.app`) liefert ein statisches HTML mit `<title>Nachbar Kiosk</title>` und Viewport 1280x800 — das ist der alte Pi-Kiosk-Prototype aus der Zeit vor dem Tauri-Pivot (2026-04-19, siehe CLAUDE.md). Das Deploy hat keinen aktiven Konsumenten mehr. **Kann geloescht werden** (als separater Spawn-Task dokumentiert — Founder-Go wegen shared-infra).

### Domains (3): alle nachvollziehbar

- `nahkreis.app` (7d, neu aber erwartet)
- `annette-theobald.de` (55d)
- `theobald.de` (55d, GmbH-Domain via IONOS)

Keine unerwarteten Domains.

### Env-Vars nachbar-io (Production, 46 Stueck)

- Aeltestes: 45d (`NEXT_PUBLIC_SUPABASE_URL`, Core-Setup)
- Neuestes: 2d (`DEVICE_PAIRING_SECRET`, Welle-B-Folgearbeit `5de2a58`)
- Alle Namen erwartet (Supabase, Stripe, Resend, Twilio, KV/Upstash, Anthropic, OpenAI, Google-AI, Tavily, Care/Civic-Encryption, VAPID, TURN, CRON, INTERNAL, RESIDENT_HASH, MAPTILER)
- Keine unerwarteten Zusatz-Vars

### Env-Vars nachbar-arzt (Production, 18 Stueck)

- Aeltestes: 37d (Core-Setup)
- Neuestes: 12d (`NEXT_PUBLIC_ARZT_LAUNCH_PHASE`, Arzt-Portal-Rollout)
- Alle erwartet

### Env-Vars nachbar-civic (Production, 8 Stueck)

- Minimalkonfiguration — passt zu "partiell ent-frost" Status
- Keine unerwarteten Eintraege

### Env-Vars nachbar-pflege (Production, 5 Stueck)

- Minimalkonfiguration — passt zu "eingefroren" Status
- Keine unerwarteten Eintraege

### Env-Gesamtuebersicht

| Projekt          | Env-Count (Prod) | Status laut Memory   |
|:-----------------|-----------------:|:---------------------|
| nachbar-io       |               46 | Haupt-App, LIVE      |
| nachbar-arzt     |               18 | LIVE                 |
| nachbar-civic    |                8 | partiell ent-frost   |
| nachbar-pflege   |                5 | eingefroren          |

### Deployments nachbar-io (letzte 20 auf Production)

- **Alle Deployer: `thomasth1977`** — keine fremden Accounts
- Alle Status `● Ready`, Build-Dauer 24s-2m (normal)
- Frequenz: ~1-10/Tag in letzten 4 Tagen — normaler Entwickler-Rhythmus

## Dashboard-Checks, die CLI nicht ersetzt

- **Login-Activity** (fremde IPs, Laender) — NUR Dashboard: https://vercel.com/dashboard → Account Settings → Activity
- **Env-Var-Read-Events** (wer hat wann welche Var gelesen) — NUR Dashboard
- **Webhook- und Deploy-Hook-Listen pro Projekt** — Dashboard bzw. Projekt-Settings
- **Integrationen** (GitHub, Stripe-Integration, Sentry, etc.) — Dashboard

**Empfehlung:** Trotz sauberem CLI-Snapshot den Browser-Check durchfuehren — 2 Minuten, fokussiert auf Login-Activity letzte 30 Tage. Wenn dort auch sauber: direkt in P0-Rotation einsteigen.

## Gesamt-Bewertung

**CLI-Layer: keine Rot-Flaggen.** Struktur entspricht dem erwarteten Solo-Founder-Setup. Keine unerklaerlichen Projekte, Env-Vars oder Deployer.

Der Vercel-Security-Bulletin-Anlass ist aus CLI-Sicht **nicht** in Indikatoren sichtbar. Bleibt: Dashboard-Check als Zweit-Layer + P0/P1-Rotation als Hauptmassnahme.

## Referenzen

- Incident-Kontext: `nachbar-io/docs/plans/2026-04-21-vercel-incident-sprechvorlagen.md`
- Rotation-Plan: `nachbar-io/docs/plans/2026-04-20-secret-rotation-checklist.md`
- Session-Start: `nachbar-io/docs/plans/2026-04-21-session-start-rotation-und-drift.md`
