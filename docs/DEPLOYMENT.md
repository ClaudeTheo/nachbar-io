# Nachbar.io — Deployment-Dokumentation

> Umgebungsvariablen, Supabase-Setup, Vercel-Konfiguration, lokale Entwicklung und Produktions-Checkliste.
> Sprache: Deutsch. Stand: Maerz 2026.

---

## Inhaltsverzeichnis

1. [Umgebungsvariablen](#1-umgebungsvariablen)
2. [Supabase-Setup](#2-supabase-setup)
3. [Vercel-Konfiguration](#3-vercel-konfiguration)
4. [Lokale Entwicklung](#4-lokale-entwicklung)
5. [Health-Check-Endpunkte](#5-health-check-endpunkte)
6. [Produktions-Checkliste](#6-produktions-checkliste)

---

## 1. Umgebungsvariablen

### Supabase (Pflicht)

| Variable | Typ | Beschreibung |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase-Projekt-URL (z.B. `https://xxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase Anonymous Key (fuer Client-Zugriff) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Service-Role-Key (nur fuer Skripte, NIEMALS im Client) |

### Web Push (VAPID)

| Variable | Typ | Beschreibung |
|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public | VAPID Public Key fuer Web Push Subscriptions |
| `VAPID_PRIVATE_KEY` | Secret | VAPID Private Key fuer das Signieren von Push-Nachrichten |

### Care-Modul Verschluesselung

| Variable | Typ | Beschreibung |
|---|---|---|
| `CARE_ENCRYPTION_KEY` | Secret | AES-256-GCM Schluessel (64 Hex-Zeichen = 32 Bytes). Wird fuer die Verschluesselung sensibler Pflegedaten verwendet (Notfallkontakt-Telefonnummern, Versicherungsnummern). |

### Cron-Sicherheit

| Variable | Typ | Beschreibung |
|---|---|---|
| `CRON_SECRET` | Secret | Bearer-Token fuer die Authentifizierung der Cron-Endpunkte. Vercel Cron-Jobs senden diesen automatisch als `Authorization: Bearer <secret>`. |

### KI-News-Aggregation (Anthropic)

| Variable | Typ | Beschreibung |
|---|---|---|
| `ANTHROPIC_API_KEY` | Secret | API-Key fuer Anthropic Claude Haiku (Nachrichtenzusammenfassung) |

### Interne API-Sicherheit

| Variable | Typ | Beschreibung |
|---|---|---|
| `INTERNAL_API_SECRET` | Secret | Geheimer Schluessel fuer interne API-Aufrufe (Push-Send, Admin-Broadcast) |

### App-URL

| Variable | Typ | Beschreibung |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Public | Basis-URL der Anwendung (z.B. `https://nachbar-io.vercel.app`). Wird fuer QR-Code-Generierung und absolute Links verwendet. |

### Twilio (geplant, noch nicht aktiv)

| Variable | Typ | Beschreibung |
|---|---|---|
| `TWILIO_SID` | Secret | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Secret | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Secret | Twilio Absender-Telefonnummer |

**Hinweis:** SMS- und Voice-Kanaele sind aktuell als Stubs implementiert und loggen nur. Die Twilio-Variablen werden erst bei Aktivierung der SMS/Voice-Kanaele benoetigt (vorgesehen fuer Premium-Plan).

---

## 2. Supabase-Setup

### Projekt-Region

| Parameter | Wert |
|---|---|
| Region | EU Frankfurt (`eu-central-1`) |
| Grund | DSGVO-Konformitaet — Daten verbleiben in der EU |

### Migrationen ausfuehren

Alle SQL-Migrationen befinden sich unter `supabase/migrations/`. Sie muessen in numerischer Reihenfolge ausgefuehrt werden.

```bash
# Supabase CLI installieren (falls nicht vorhanden)
npm install -g supabase

# Login
supabase login

# Projekt verknuepfen
supabase link --project-ref <PROJECT_REF>

# Alle Migrationen ausfuehren
supabase db push
```

**Care-Modul-Migrationen (019-032):**

| Migration | Beschreibung |
|---|---|
| 019 | Gemeinsame Funktionen (Trigger, Helfer-Check) |
| 020 | care_profiles |
| 021 | care_sos_alerts |
| 022 | care_sos_responses |
| 023 | care_checkins |
| 024 | care_medications |
| 025 | care_medication_logs |
| 026 | care_appointments |
| 027 | care_helpers |
| 028 | care_audit_log (append-only) |
| 029 | care_documents |
| 030 | care_subscriptions |
| 031 | notifications-Tabelle erweitern (Care-Typen) |
| 032 | Datenmigration senior_checkins -> care_checkins |

### Row Level Security (RLS)

RLS ist auf **allen** Care-Tabellen aktiviert. Das Berechtigungsmodell:

- **Eigene Daten:** Nutzer sehen/bearbeiten nur eigene Datensaetze
- **Helfer-Zugriff:** Verifizierte Helfer (`is_care_helper_for()`) sehen Daten ihrer zugewiesenen Senioren
- **Admin-Zugriff:** Administratoren (`is_admin()`) haben Lese-/Schreibzugriff
- **Audit-Log:** Append-only per DB-Trigger erzwungen

Siehe `docs/DATABASE_SCHEMA.md` fuer die vollstaendige RLS-Policy-Uebersicht.

### Storage-Buckets

Die folgenden Storage-Buckets werden benoetigt (siehe Migration `017_storage_buckets.sql`):

| Bucket | Zweck | Zugriff |
|---|---|---|
| `avatars` | Profilbilder der Nutzer | Public (Lese), Auth (Schreib) |
| `reports` | Generierte Pflegeberichte | Private (nur ueber RLS) |

### Seed-Daten

```bash
# Testdaten laden (optional, nur fuer Entwicklung)
supabase db reset
# Oder manuell:
psql -f supabase/seed.sql
```

Fuer Testnutzer steht ein Skript bereit:
```bash
# Benoetigt SUPABASE_SERVICE_ROLE_KEY in .env.local
npx tsx scripts/create-test-users.ts
```

---

## 3. Vercel-Konfiguration

### vercel.json

Die Konfigurationsdatei `vercel.json` definiert:

#### Framework und Region

| Parameter | Wert | Beschreibung |
|---|---|---|
| `framework` | `nextjs` | Next.js 16 Framework |
| `regions` | `["fra1"]` | Frankfurt (EU) — DSGVO-konform, nahe am Supabase-Server |

#### Cron-Jobs

| Pfad | Zeitplan | Beschreibung |
|---|---|---|
| `/api/news/scrape` | `0 7 * * 1` | Montags um 07:00 — Nachrichten scrapen |
| `/api/news/rss` | `0 7 * * 3,6` | Mi + Sa um 07:00 — RSS-Feeds |
| `/api/care/cron/escalation` | `* * * * *` | Jede Minute — SOS-Eskalation |
| `/api/care/cron/checkin` | `*/5 * * * *` | Alle 5 Min — Check-in-Scheduler |
| `/api/care/cron/medications` | `*/5 * * * *` | Alle 5 Min — Medikamenten-Erinnerungen |
| `/api/care/cron/appointments` | `*/5 * * * *` | Alle 5 Min — Termin-Erinnerungen |

**Wichtig:** Cron-Jobs werden von Vercel automatisch mit dem `CRON_SECRET` als `Authorization: Bearer <secret>` Header aufgerufen. Die Cron-Endpunkte pruefen diesen Header.

#### Custom Headers

| Pfad | Header | Wert | Zweck |
|---|---|---|---|
| `/sw.js` | `Service-Worker-Allowed` | `/` | Service Worker fuer das Root-Scope erlauben |
| `/sw.js` | `Cache-Control` | `no-cache, no-store, must-revalidate` | Service Worker immer frisch laden |
| `/manifest.json` | `Cache-Control` | `public, max-age=3600` | PWA-Manifest 1 Stunde cachen |

---

## 4. Lokale Entwicklung

### Voraussetzungen

- Node.js 20+
- npm oder pnpm
- Supabase CLI (fuer lokale Datenbank)
- Git

### Setup-Schritte

```bash
# 1. Repository klonen
git clone <repo-url>
cd nachbar-io

# 2. Abhaengigkeiten installieren
npm install

# 3. Umgebungsvariablen konfigurieren
# .env.local erstellen mit folgenden Variablen:
#
# NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
# NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-aus-supabase-start>
# SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
# NEXT_PUBLIC_VAPID_PUBLIC_KEY=<vapid-public-key>
# VAPID_PRIVATE_KEY=<vapid-private-key>
# CARE_ENCRYPTION_KEY=<64-hex-zeichen>
# CRON_SECRET=<beliebiger-string>
# INTERNAL_API_SECRET=<beliebiger-string>
# NEXT_PUBLIC_APP_URL=http://localhost:3000

# 4. Supabase lokal starten
supabase start

# 5. Migrationen ausfuehren
supabase db push

# 6. (Optional) Testnutzer erstellen
npx tsx scripts/create-test-users.ts

# 7. Entwicklungsserver starten
npm run dev
```

### VAPID-Keys generieren

```bash
npx web-push generate-vapid-keys
```

### CARE_ENCRYPTION_KEY generieren

```bash
# 32 zufaellige Bytes als Hex-String
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Verfuegbare npm-Skripte

| Befehl | Beschreibung |
|---|---|
| `npm run dev` | Next.js Entwicklungsserver starten |
| `npm run build` | Produktions-Build erstellen |
| `npm start` | Produktions-Server starten |
| `npm run lint` | ESLint ausfuehren |
| `npm test` | Vitest Unit-Tests (einmalig) |
| `npm run test:watch` | Vitest im Watch-Modus |
| `npm run test:coverage` | Tests mit Coverage-Bericht |
| `npm run test:e2e` | Playwright E2E-Tests |
| `npm run test:e2e:ui` | Playwright mit UI-Modus |

### Lokale Cron-Jobs testen

Da Vercel Cron-Jobs lokal nicht automatisch laufen, koennen die Endpunkte manuell aufgerufen werden:

```bash
# SOS-Eskalation
curl http://localhost:3000/api/care/cron/escalation

# Check-in-Scheduler
curl http://localhost:3000/api/care/cron/checkin

# Medikamenten-Erinnerungen
curl http://localhost:3000/api/care/cron/medications

# Termin-Erinnerungen
curl http://localhost:3000/api/care/cron/appointments
```

**Hinweis:** Wenn `CRON_SECRET` gesetzt ist, muss der Authorization-Header mitgesendet werden:
```bash
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/care/cron/escalation
```

---

## 5. Health-Check-Endpunkte

### Care-Modul Health Check

**Endpunkt:** `GET /api/care/health`
**Authentifizierung:** Keine (oeffentlich fuer Monitoring)
**Cache:** 5 Sekunden In-Memory-Cache

**Antwort-Format:**
```json
{
  "overall": "ok" | "warn" | "error",
  "checks": [
    { "name": "Care-Profile", "status": "ok", "detail": "12 Profile, 45ms", "responseMs": 45 },
    { "name": "SOS-Alarme", "status": "ok", "detail": "0 aktiv" },
    { "name": "Check-in Cron", "status": "ok", "detail": "Letzter vor 3 Min." },
    { "name": "Audit-Log", "status": "ok", "detail": "1234 Eintraege" },
    { "name": "Abonnements", "status": "ok", "detail": "8 Abonnements" }
  ],
  "timestamp": "2026-03-10T14:30:00.000Z"
}
```

**Pruefungen:**

| Check | OK | Warn | Error |
|---|---|---|---|
| Care-Profile | Tabelle erreichbar, < 2s | Antwortzeit > 2s | Tabelle nicht erreichbar |
| SOS-Alarme | Keine aktiven Alerts | Aktive Alerts vorhanden | Abfrage fehlgeschlagen |
| Check-in Cron | Letzter Check-in < 30 Min | Letzter Check-in > 30 Min | Abfrage fehlgeschlagen |
| Audit-Log | Tabelle erreichbar | — | Tabelle nicht erreichbar |
| Abonnements | Tabelle erreichbar | — | Tabelle nicht erreichbar |

### Admin Health Check

**Endpunkt:** `GET /api/admin/health`
**Beschreibung:** Allgemeiner System-Health-Check (prueft Supabase-Verbindung, VAPID-Keys, Anthropic API, Cron-Secret-Konfiguration).

---

## 6. Produktions-Checkliste

### Umgebungsvariablen

- [ ] `NEXT_PUBLIC_SUPABASE_URL` auf Produktions-Supabase-Projekt gesetzt
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` auf Produktions-Anon-Key gesetzt
- [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY` generiert und gesetzt
- [ ] `VAPID_PRIVATE_KEY` generiert und gesetzt
- [ ] `CARE_ENCRYPTION_KEY` sicher generiert (64 Hex-Zeichen) und gesetzt
- [ ] `CRON_SECRET` gesetzt (wird von Vercel Cron-Jobs automatisch verwendet)
- [ ] `INTERNAL_API_SECRET` gesetzt
- [ ] `ANTHROPIC_API_KEY` gesetzt (fuer News-Aggregation)
- [ ] `NEXT_PUBLIC_APP_URL` auf Produktions-URL gesetzt

### Supabase

- [ ] Projekt in EU Frankfurt (`eu-central-1`) erstellt
- [ ] Alle Migrationen (001-032) ausgefuehrt
- [ ] RLS auf allen Tabellen aktiviert (automatisch durch Migrationen)
- [ ] Storage-Buckets `avatars` und `reports` erstellt
- [ ] Supabase Auth konfiguriert (E-Mail-Verifizierung, Redirect-URLs)
- [ ] Connection Pooling aktiviert (fuer Produktionslast)

### Vercel

- [ ] Projekt mit GitHub-Repository verbunden
- [ ] Region auf `fra1` (Frankfurt) gesetzt
- [ ] Alle Umgebungsvariablen in Vercel Dashboard eingetragen
- [ ] Cron-Jobs in vercel.json korrekt konfiguriert
- [ ] Custom Domain konfiguriert (falls vorhanden)
- [ ] HTTPS erzwungen

### Sicherheit

- [ ] Keine Secrets in Client-Code (`NEXT_PUBLIC_` nur fuer oeffentliche Werte)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` NUR in Skripten, NIEMALS im Frontend
- [ ] CARE_ENCRYPTION_KEY sicher aufbewahrt (Verlust = Datenverlust)
- [ ] Cron-Endpunkte durch CRON_SECRET geschuetzt
- [ ] Push-Endpunkte durch INTERNAL_API_SECRET geschuetzt

### DSGVO

- [ ] Supabase-Server in EU Frankfurt
- [ ] Vercel-Region auf Frankfurt gesetzt
- [ ] Keine Adressdaten im Client-State (nur household_id)
- [ ] Sensible Daten verschluesselt (AES-256-GCM)
- [ ] RLS auf allen Tabellen aktiv
- [ ] Audit-Log revisionssicher (append-only per DB-Trigger)
- [ ] Auftragsverarbeitungsvertraege (AVV) mit Supabase und Vercel abgeschlossen

### Monitoring

- [ ] Health-Check-Endpunkt (`/api/care/health`) in Monitoring-System eingebunden
- [ ] Admin-Health-Check (`/api/admin/health`) regelmaessig geprueft
- [ ] Vercel-Logs fuer Fehler ueberwacht
- [ ] Cron-Job-Ausfuehrung ueberwacht (Vercel Dashboard -> Cron)

### Notfall-Banner (KRITISCH)

- [ ] Bei `medical_emergency`-Kategorie wird IMMER 112/110 zuerst angezeigt
- [ ] Notfall-Banner in Rot (`#EF4444`) — nur fuer diesen Zweck
- [ ] Alle anderen Alerts in Amber (`#F59E0B`)
