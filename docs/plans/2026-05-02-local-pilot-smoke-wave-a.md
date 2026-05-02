# Local Pilot Smoke Wave A — 2026-05-02

Stand: nach groesserem lokalen Pilot-Smoke gegen `start:local` auf Port 3001.

## Harte Linien

- Kein Prod-DB-Write.
- Keine Prod-Migration.
- Keine Vercel-Env-Aenderung.
- Kein Deploy.
- Keine echten Pflege-/Medizin-/Personendaten.
- Lokale E2E-Daten waren synthetische Testdaten gegen lokalen Supabase-Stack.

## Ausgangspunkt

- Repo: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`
- Branch: `master`
- Remote: `origin/master`
- Startzustand: `master...origin/master`
- Production vor dieser Welle: `37b3bb5` deployed und Smoke-gruen.

## Lokaler Stack

Lokaler Supabase-Stack lief bereits:

- Project URL: `http://127.0.0.1:54321`
- DB: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- Studio: `http://127.0.0.1:54323`

Port 3001 war vor Start frei.

## Verifikation

Build:

```powershell
npm run build:local
```

Ergebnis:

- Next.js Production-Build erfolgreich.
- TypeScript erfolgreich.
- 230 statische Seiten generiert.
- Bekannte lokale Meldung: `STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert`.

Server:

```powershell
npm run start:local
```

Ergebnis:

- Server bereit auf `http://localhost:3001`.
- Server nach dem Testlauf gestoppt.

Breiter E2E-Smoke:

```powershell
$env:E2E_BASE_URL="http://localhost:3001"
$env:E2E_LIVE="true"
$env:E2E_CLEANUP="true"
$env:E2E_TEST_SECRET="e2e-test-secret-dev"
npx playwright test --config=tests/e2e/playwright.config.ts --project=multi-agent --workers=1 --timeout=60000
```

Ergebnis:

- `80 passed`
- Laufzeit: ca. 4.9 Minuten
- Global Setup: 9 synthetische Agenten geseedet.
- Global Teardown: Cleanup abgeschlossen.

Abgedeckte Hauptbereiche:

- S1 Onboarding / Invite / Login
- S2 Hilfe-Anfrage
- S3 Direktnachricht / Chat
- S4 Rollen / Moderation / Admin
- S6 Permission / Privacy Grenzen
- S7 Smoke / Regression Quick Pack
- S8 Care SOS
- S9 Care Check-in / Medikamente
- S10 Accessibility
- S11 Memory Layer
- S12 Kontaktanfrage -> Annahme -> Chat

## Beobachtete lokale Noise

Nicht blockierend:

- `STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert`
- `Upstash Redis nicht konfiguriert — Security-Scoring deaktiviert`
- `security-redis redis_unavailable` lokal fail-open
- `Keine Push-Subscription fuer User ...`
- `api/notifications/create Push fehlgeschlagen: 503`
- ein lokaler `Push fehlgeschlagen: 429`
- nach Testende vereinzelte Browser-Console-Meldungen `TypeError: Failed to fetch` bzw. `503/404`, offenbar beim Session-/Cleanup-/Shutdown-Nachlauf

Wichtig: Diese Noise hat den Testlauf nicht rot gemacht. Die vor der Welle relevante S12-Chat-Notification-Kette lief gruen.

## Ergebnis

Groessere Welle A ist lokal abgeschlossen:

- Build gruen.
- Lokaler Production-Server startete sauber.
- Breite Multi-Agent-Pilot-Suite gruen.
- Server wurde danach gestoppt.

Kein Code wurde geaendert. Diese Datei dokumentiert nur die Verifikation.
