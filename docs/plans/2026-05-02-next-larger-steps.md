# Next Larger Steps — 2026-05-02

Stand: nach live deploytem Chat-Notification-Fix, gruener CI und Production-Smoke auf `37b3bb5`.

## Ziel

Nicht mehr kleinteilig einzelne Symptome jagen, sondern den naechsten Pilot-Block in groesseren, abgeschlossenen Arbeitswellen bearbeiten. Jede Welle endet mit Verifikation, lokalem Commit und nur bei Founder-Go mit Push/Deploy.

## Harte Linien

- Keine Prod-DB-Writes oder Prod-Migrationen ohne neues Founder-Go.
- Keine Vercel-Env-Aenderungen ohne neues Founder-Go.
- Keine Feature-Flag-/Preset-Schalter ohne neues Founder-Go.
- Keine echten Pflege-/Medizin-/Personendaten.
- Keine Windows-Prebuild-Deploys fuer Production.

## Groessere Welle A — Authentifizierter Pilot-Smoke lokal nachbauen

Ziel: Die Live-relevanten Pilot-Flows lokal mit synthetischen Daten in einem groesseren Durchlauf absichern.

Scope:

- Registrierung / Invite-Gate
- Login / After-Login-Routing
- Kontakte / Chat / Notification-Erstellung
- Quartier-Kontext
- Hilfe-Flow Basis

Verifikation:

```powershell
npm run build:local
npm run start:local
$env:E2E_BASE_URL="http://localhost:3001"
$env:E2E_LIVE="true"
$env:E2E_CLEANUP="true"
$env:E2E_TEST_SECRET="e2e-test-secret-dev"
npx playwright test --config=tests/e2e/playwright.config.ts --project=multi-agent --workers=1 --timeout=60000
```

Ergebnis dokumentieren in `docs/plans/`.

## Groessere Welle B — Production Readiness Read-only Audit

Ziel: Production nur lesend auf offensichtliche Pilot-Risiken pruefen, ohne Login-Daten oder echte Nutzeraktionen zu erzeugen.

Scope:

- Public Routes: `/`, `/login`, `/register`, `/datenschutz`, `/impressum`
- Closed-Pilot-Guard: erwartete `closed_pilot`-Antworten fuer geschuetzte APIs
- Vercel-Meta: Production-SHA entspricht `origin/master`
- Console: keine 403/406/5xx auf unauthentifizierten Smoke-Routen

Nicht im Scope:

- Authentifizierter Prod-Chat-Test
- Testnutzer in Prod erzeugen
- Feature Flags umstellen
- DB oder Env aendern

## Groessere Welle C — Pilot-Onboarding-Polish

Ziel: Die echte Pilot-Erfahrung fuer Familien weiter abrunden, ohne Systemarchitektur anzufassen.

Moegliche Teilbereiche:

- Register-Rollen-Screen visuell ruhiger und klarer machen
- KI-Consent-Screen waermer formulieren
- Mobile-Screenshots pruefen
- Senior-Mode-Touch-Targets gegen 80-px-Regel pruefen

Vor jeder Umsetzung:

- Pre-Check per `rg` auf bestehende Komponenten und Texte.
- TDD fuer sichtbare Logik.
- Kein neues Design-System und keine neue UI-Lib.

## Groessere Welle D — Founder-Gates vorbereiten

Ziel: Alles vorbereiten, was Thomas spaeter per Go entscheiden muss, ohne die roten Aktionen selbst auszufuehren.

Vorbereitbar:

- Checkliste fuer Vercel-Env-Sicherheitscheck
- Checkliste fuer Migrationen 176/177/178
- Checkliste fuer AI-Test-User-Cleanup
- Checkliste fuer AVV-/Provider-Status

Nicht ausfuehren:

- Prod-Migrationen
- Prod-Deletes
- Vercel-Env-Aenderungen
- Billing/Stripe-Schalter

## Empfohlene Reihenfolge

1. Welle A lokal durchziehen.
2. Falls lokal gruen: kleine Doku + Commit.
3. Mit Founder-Go pushen.
4. CI abwarten.
5. Welle B read-only gegen Production.
6. Danach erst Welle C UI/Onboarding.

## Aktueller Ausgangspunkt

- `master` synchron mit `origin/master`.
- Production steht auf `37b3bb5`.
- CI fuer `37b3bb5` ist gruen.
- Letzter App-Fix: `630fe9e fix(chat): allow contact notification delivery`.
