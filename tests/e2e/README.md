# Nachbar.io — Multi-Agent E2E Test Suite

Automatisierte End-to-End Tests mit mehreren simulierten Nutzern (Agenten), die parallel agieren.

## Architektur

```
tests/e2e/
├── playwright.config.ts      # Playwright-Konfiguration (Multi-Projekt)
├── global-setup.ts            # Testdaten seeden (Haushalte, Nutzer)
├── global-teardown.ts         # Testdaten aufraeumen
├── auth-setup.ts              # StorageState fuer Testrollen erzeugen
├── cross-portal-teardown.ts   # Manueller Cross-Portal-Cleanup
├── helpers/
│   ├── auth-paths.ts           # StorageState-Pfade
│   ├── types.ts               # TypeScript-Typen
│   ├── test-config.ts         # Test-Agenten, Haushalte, Timeouts
│   ├── agent-factory.ts       # Browser-Kontexte pro Agent erstellen
│   ├── db-seeder.ts           # Supabase-Seeding (Admin API)
│   ├── index.ts               # Helper-Barrel
│   ├── observer.ts            # UI-Beobachter (Toasts, Unread, Errors)
│   ├── portal-urls.ts         # Portal-Basis-URLs
│   ├── scenario-runner.ts     # Multi-Agent Orchestrierung
│   └── supabase-admin.ts      # Supabase Admin REST Helper
├── pages/
│   ├── index.ts               # Barrel Export
│   ├── care-sos.page.ts       # Care/SOS Page Object
│   ├── landing.page.ts        # Landing Page Object
│   ├── login.page.ts          # Login Page Object
│   ├── register.page.ts       # Register Page Object (4 Schritte)
│   ├── dashboard.page.ts      # Dashboard/Feed Page Object
│   ├── help.page.ts           # Hilfe-Boerse Page Object
│   ├── messages.page.ts       # Nachrichten/Chat Page Object
│   ├── admin.page.ts          # Admin Dashboard Page Object
│   └── senior.page.ts         # Senioren-Terminal Page Objects
├── scenarios/
│   ├── auth-board.spec.ts     # Auth-Flow: Schwarzes Brett / Hilfe-Boerse
│   ├── auth-dashboard.spec.ts # Auth-Flow: Dashboard
│   ├── auth-map.spec.ts       # Auth-Flow: Quartierskarte
│   ├── auth-notfall.spec.ts   # Auth-Flow: Notfall-System
│   ├── auth-profile.spec.ts   # Auth-Flow: Profil & Einstellungen
│   ├── s1-onboarding.spec.ts  # Registrierung + Verifikation
│   ├── s2-help-request.spec.ts # Hilfe-Anfrage → Zustellung → Annahme
│   ├── s3-chat.spec.ts        # Direktnachricht / Chat
│   ├── s4-moderation.spec.ts  # Admin / Moderation
│   ├── s5-senior-terminal.spec.ts # Senioren-UI Komplett
│   ├── s6-permissions.spec.ts # Zugriffskontrolle / Privacy
│   ├── s7-smoke.spec.ts       # Schnelle Regressionstests
│   ├── s8-care-sos.spec.ts    # Care SOS Workflow
│   ├── s9-care-checkin.spec.ts # Care Check-in & Medikamente
│   ├── s10-accessibility.spec.ts # WCAG 2.1 AA
│   ├── s11-memory.spec.ts     # Senior Memory Layer
│   └── s12-neighbor-request-chat.spec.ts # Anfrage -> Annahme -> Chat
├── pilot-smoke.spec.ts        # 12 Pilot-Kriterien
├── multi-agent/
│   ├── phase-a-solo.spec.ts
│   ├── phase-b-cross-role.spec.ts
│   ├── phase-c-edge-cases.spec.ts
│   ├── phase-d-features.spec.ts
│   ├── phase-e-escalation.spec.ts
│   └── phase-f-permissions.spec.ts
└── cross-portal/
    ├── x01-checkin-heartbeat.spec.ts
    ├── x02-heartbeat-timeout.spec.ts
    ├── x03-sos-pflege-alert.spec.ts
    ├── x04-kiosk-sos-112.spec.ts
    ├── x05-sos-eskalation-zeitraffer.spec.ts
    ├── x06-termin-buchung.spec.ts
    ├── x07-termin-bestaetigung.spec.ts
    ├── x08-termin-ablehnung.spec.ts
    ├── x09-termin-stornierung.spec.ts
    ├── x10-video-konsultation.spec.ts
    ├── x12-video-ablehnung.spec.ts
    ├── x13-medikamentenplan.spec.ts
    ├── x14-rathaus-ankuendigung.spec.ts
    ├── x16-caregiver-invite.spec.ts
    ├── x17-dsgvo-widerruf.spec.ts
    ├── x18-dual-role-permissions.spec.ts
    ├── x19-postfach-thread.spec.ts
    └── x20-caregiver-memory.spec.ts
```

## Agenten (simulierte Nutzer)

| Agent | Rolle | UI-Modus | Haushalt | Prefix |
|-------|-------|----------|----------|--------|
| nachbar_a | Nachbar | Active | Purkersdorfer 1 | [A] |
| helfer_b | Helfer | Active | Purkersdorfer 3 | [B] |
| moderator_m | Moderator/Admin | Active | Sanarystr. 5 | [M] |
| senior_s | Senior | Senior | Ob. Rebberg 12 | [S] |
| betreuer_t | Betreuer | Active | Ob. Rebberg 12 | [T] |
| unverified_x | Nicht verifiziert | Active | (ungueltig) | [X] |

## Lokal ausfuehren

### Voraussetzungen

```bash
cd nachbar-io
npm install
npx playwright install --with-deps chromium
```

### Smoke Tests (ohne Supabase)

```bash
npm run test:e2e:smoke
```

### Alle Multi-Agent Tests

```bash
# .env.local muss gesetzt sein:
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...

npm run test:e2e:multi
```

### Lokaler Production-Smoke mit lokalem Supabase

Wenn `.env.production.local` aus `vercel pull` existiert, zeigt ein normales
`next start` im Production-Modus auf die Cloud-Umgebung. Fuer lokale E2E-Smokes
gegen `127.0.0.1:54321` deshalb den expliziten lokalen Startpfad nutzen:

```bash
npm run supabase:start
npm run build
npm run start:local
```

Die Tests dann in einer zweiten Shell gegen Port 3001 starten:

```bash
E2E_BASE_URL=http://localhost:3001 npm run test:e2e:multi
```

### Einzelne Szenarien

```bash
# Nur Onboarding
npx playwright test --config=tests/e2e/playwright.config.ts s1-onboarding

# Nur Senior-Terminal
npm run test:e2e:senior

# Mit Playwright UI
npm run test:e2e:multi:ui
```

### Testdaten seeden/resetten

Das Seeding laeuft automatisch via `global-setup.ts`. Drei Strategien:

1. **Direkt** (bevorzugt): Supabase Admin API mit `SUPABASE_SERVICE_ROLE_KEY`
2. **API-Route**: Falls `/api/test/seed` implementiert ist
3. **UI-basiert**: Tests registrieren Nutzer selbst via Formulare

Manuelles Cleanup:
```bash
E2E_CLEANUP=true npx playwright test --config=tests/e2e/playwright.config.ts global-teardown
```

## CI (GitHub Actions)

Die Datei `.github/workflows/e2e-tests.yml` definiert zwei Jobs:

1. **e2e-smoke**: Schnelle Regressionstests (immer, ohne Supabase)
2. **e2e-multi-agent**: Volle Multi-Agent Suite (nur wenn Secrets gesetzt)

### Secrets konfigurieren

In GitHub Settings > Secrets and Variables > Actions:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Artifacts

- HTML Report: `playwright-report/`
- JUnit XML: `test-results/junit.xml`
- Screenshots/Videos: `test-results/` (bei Fehlern)

## Szenarien

### S1: Onboarding + Verifikation
- 4-Schritt Registrierung mit Invite-Code
- Ungueltiger Code wird abgelehnt
- Senior-Modus fuehrt zu Senior-Home
- Login nach Registrierung

### S2: Hilfe-Anfrage → Zustellung → Annahme
- Agent A erstellt Hilfe-Anfrage
- Agent B sieht sie im Feed (Realtime oder Reload)
- Agent B nimmt an, Agent A sieht Status-Aenderung

### S3: Direktnachricht / Chat
- Nachrichten-Seite laed fuer beide Agenten
- Chat-Nachrichten werden zugestellt
- Keine Duplikate
- Unread-Counter funktioniert

### S4: Moderation / Admin
- Moderator kann Admin-Dashboard oeffnen
- Normaler Nutzer hat keinen Admin-Zugang
- Admin-Tabs durchklicken ohne Fehler

### S5: Senioren-Terminal
- Alle 4 grossen Buttons sichtbar
- Navigation zu allen Senior-Seiten
- Check-in "Alles in Ordnung" funktioniert
- Touch-Targets >= 80px
- Modus-Wechsel zu normalem Dashboard

### S6: Permission / Privacy
- 8 geschuetzte Routen redirecten zu Login
- Datenschutz/Impressum sind IMMER oeffentlich (DSGVO)
- Login/Register sind oeffentlich
- API-Routen geben keinen 500-Error

### S7: Smoke / Regression
- Alle oeffentlichen Seiten laden (kein 500)
- Login/Register rendern korrekt
- Keine Konsolenfehler
- CSS laed korrekt
- Keine doppelten DOM-IDs
- Meta-Tags vorhanden

## Neues Szenario hinzufuegen

1. Datei erstellen: `tests/e2e/scenarios/s13-mein-szenario.spec.ts`
2. Pattern: `test.describe("S13: ...", () => { ... })`
3. Agenten erstellen: `createAgent(browser, "nachbar_a")`
4. Einloggen: `loginAgent(agent)`
5. Page Objects nutzen: `new DashboardPage(agent.page)`
6. Assertions mit `expect(...)`
7. Aufraeumen: `cleanupAgents(agentA, agentB)` im `afterEach`

## data-testid Konvention

Folgende `data-testid` Attribute sind im App-Code gesetzt:

### Dashboard
- `dashboard-greeting` — Tageszeit-Begruessung
- `notification-bell` — Benachrichtigungs-Glocke
- `unread-badge` — Unread-Zaehler
- `create-help-button` — "Hilfe anfragen" Button

### Hilfe-Boerse
- `help-card` — Einzelne Hilfe-Karte
- `create-help-button` — "Neuer Eintrag" Button
- `help-filter-button` — Kategorie-Filter

### Nachrichten
- `conversation-card` — Konversations-Karte
- `unread-count` — Unread-Badge pro Konversation
- `chat-back` — Zurueck-Button im Chat
- `chat-partner-name` — Name des Chat-Partners
- `chat-message` — Einzelne Nachricht
- `chat-input` — Nachrichten-Eingabefeld
- `chat-send` — Senden-Button
- `read-receipt` — "Gelesen" Indikator

### Alert
- `alert-card` — Alert-Karte

### Senioren-UI
- `senior-greeting` — Begruessung
- `senior-*-button` — Senior-Buttons (automatisch aus Label generiert)

## Known Limitations

1. **Realtime-Tests**: Supabase Realtime funktioniert nur mit echtem Supabase-Backend. Ohne Backend werden Realtime-Updates via Page-Reload getestet.
2. **Push Notifications**: Web Push kann in Playwright nicht vollstaendig getestet werden. Push-Subscriptions werden gemockt.
3. **Invite-Codes**: Tests setzen voraus, dass Test-Haushalte mit den Codes TEST0001-TEST0004 existieren (via Seeding).
4. **Email-Verifikation**: Supabase `email_confirm: true` im Seeder ueberspringt Email-Verifikation.
5. **Parallele Multi-Agent Tests**: Szenarien mit 2+ Agenten laufen sequenziell innerhalb eines Tests, aber verschiedene Szenarien koennen parallel laufen.
6. **Admin-Zugang**: Erfordert `is_admin: true` in der `users`-Tabelle, gesetzt via Seeding.
7. **Flaky Tests**: Realtime-abhaengige Tests (S2, S3) haben Retry-Logik mit Fallback auf Page-Reload.
