# Welle D Handover — Lokale Senior/Care UI-Previews

Stand: 2026-05-03 vormittags, nach lokalem Preview-Block, Browser-Smoke, Build und lokalem Commit.

## Harte Linien

- Kein Deploy ausgefuehrt.
- Kein Push ausgefuehrt.
- Kein Prod-DB-Write.
- Keine Prod-Migration.
- Keine Vercel-Env-Aenderung.
- Keine Feature-Flags geaendert.
- Keine echten Care-/Medizin-/Personendaten verwendet.
- Kein Care-Daten-Touch in lokaler DB.
- Der vorhandene E2E-Seeder wurde weiter bewusst NICHT genutzt, weil er `care_consents`, `caregiver_links` und `care_subscriptions` schreibt.
- Live bleibt weiter unveraendert, bis Thomas explizit Deploy-Go gibt.

## Repo-Stand

- Workspace: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`
- Branch: `master`
- Aktueller Head nach diesem Block: `6a71342 fix(senior-care): add local entry previews`
- Vorheriger Welle-D-Head: `b920a83 fix(senior-care): polish entry touch targets`
- `origin/master`: `6fe0ab4 docs(handoff): record wave d senior care check`
- Lokaler Stand: `master...origin/master [ahead 1]`
- Push: NICHT ausgefuehrt.
- CI: fuer `6a71342` noch nicht gelaufen, weil kein Push.

## Was neu gebaut wurde

Ziel aus vorherigem Handover:

- Frische synthetische Test-Auth ohne Care-Seeding ODER reiner UI-Preview fuer Senior/Care Entry.

Umgesetzt wurde der sichere UI-Preview-Pfad ohne Auth und ohne Datenbank:

- `/senior/preview`
  - Rendert die Senior-Home-Kernaktionen mit Beispielname `Erika`.
  - Nutzt bestehendes Senior-Layout mit Notrufleiste.
- `/care/preview`
  - Rendert den Care-Hub mit statischen lokalen Einstiegsdaten.
  - Keine API-Loads, keine Care-DB.
- `/care/consent/preview`
  - Rendert Consent-Copy und Consent-Karten mit lokalem State.
  - Keine API-Loads, keine Speicherung.

Alle Preview-Routen sind ueber `lib/local-ui-preview.ts` nur ausserhalb von `NODE_ENV=production` aktiv. In Production rufen sie `notFound()`.

## Code-Aenderungen

Commit: `6a71342 fix(senior-care): add local entry previews`

Neue/extrahierte Komponenten:

- `components/senior/SeniorHomeActions.tsx`
  - Aus `app/senior/home/page.tsx` extrahierte Senior-Home-Aktionen.
  - Echte Seite navigiert weiter via `router.push`, Preview nutzt No-Op.
- `modules/care/components/CareHubTileGrid.tsx`
  - Aus `app/(app)/care/page.tsx` extrahierte 6-Kachel-Grid-UI.
  - Echte Seite liefert Live-Status, Preview liefert statische lokale Daten.
- `modules/care/components/consent/CareConsentNotice.tsx`
  - Aus `app/(app)/care/consent/page.tsx` extrahierter DSGVO-Hinweis.
- `lib/local-ui-preview.ts`
  - Gemeinsamer Guard fuer lokale Preview-Routen.

Neue Preview-Routen:

- `app/senior/preview/page.tsx`
- `app/senior/preview/SeniorLocalPreviewClient.tsx`
- `app/(app)/care/preview/page.tsx`
- `app/(app)/care/consent/preview/page.tsx`
- `app/(app)/care/consent/preview/CareConsentLocalPreviewClient.tsx`

Guard-/Bypass-Aenderungen:

- `lib/closed-pilot.ts`
  - Preview-Pfade sind im Closed-Pilot oeffentlich, damit lokale Browser-Smokes nicht ins Gate fallen.
- `components/AuthSessionProvider.tsx`
  - Preview-Pfade sind clientseitig public, damit kein `router.replace("/login")` passiert.
- `modules/care/components/consent/CareDisclaimer.tsx`
  - Care-Disclaimer wird fuer `/care/preview` und `/care/consent/preview` nicht angezeigt.
- `modules/care/components/sos/CareAlarmProvider.tsx`
  - Care-Alarm wird fuer Preview-Pfade deaktiviert.
- `modules/care/hooks/useAlarm.ts`
  - Neuer optionaler Parameter `{ disabled }`, damit der Hook keinen `/api/care/checkin/status`-Fetch startet.

## Neue Tests

- `__tests__/app/senior/local-preview.test.tsx`
  - Senior-Preview rendert `Guten Tag, Erika`, `Hilfe anfragen`, `Alles in Ordnung`.
- `__tests__/app/care/local-preview.test.tsx`
  - Care-Hub-Preview rendert `Gesundheit`, `Check-in`, `Medikamente`.
  - Care-Consent-Preview rendert freiwillige Einwilligung, Widerrufbarkeit und Consent-Karten ohne API-Load.
- `__tests__/components/AuthSessionProvider.test.ts`
  - Preview-Pfade sind clientseitig public.
- `modules/care/components/consent/CareDisclaimer.test.ts`
  - Care-Disclaimer wird fuer Preview-Pfade uebersprungen.
- `modules/care/components/sos/CareAlarmProvider.test.ts`
  - Care-Alarm wird fuer Preview-Pfade deaktiviert.
- `__tests__/middleware/closed-pilot.test.ts`
  - Preview-Pfade gehen ohne Auth-Middleware durch das Closed-Pilot-Gate.

## RED/GREEN

RED:

- Preview-Page-Tests waren zuerst rot, weil die Routen fehlten.
- Closed-Pilot-Test war rot, weil Preview-Pfade noch an `updateSession` gingen.
- AuthSessionProvider-Test war rot, weil kein exportierter Public-Path-Guard existierte.
- CareDisclaimer-Test war rot, weil kein Preview-Bypass existierte.
- CareAlarmProvider-Test war rot, weil der Alarm-Provider fuer Preview weiter aktiv war.

GREEN:

- Preview-Routen und extrahierte UI-Komponenten gebaut.
- Closed-Pilot-, Auth-, Disclaimer- und Alarm-Bypasses eng auf Preview-Pfade begrenzt.
- Fokussierte Tests danach gruen.

## Verifikation

Fresh Commands:

```powershell
npx vitest run __tests__/middleware/closed-pilot.test.ts __tests__/app/senior/local-preview.test.tsx __tests__/app/care/local-preview.test.tsx __tests__/components/AuthSessionProvider.test.ts modules/care/components/consent/CareDisclaimer.test.ts modules/care/components/sos/CareAlarmProvider.test.ts components/EmergencyBanner.test.tsx __tests__/components/care/ConsentFeatureCard.test.tsx __tests__/app/care/consent-page.test.tsx __tests__/app/senior/entry-redirect.test.ts
npx eslint __tests__/middleware/closed-pilot.test.ts __tests__/app/senior/local-preview.test.tsx __tests__/app/care/local-preview.test.tsx __tests__/components/AuthSessionProvider.test.ts modules/care/components/consent/CareDisclaimer.test.ts modules/care/components/sos/CareAlarmProvider.test.ts components/AuthSessionProvider.tsx components/senior/SeniorHomeActions.tsx app/senior/home/page.tsx app/senior/preview/page.tsx app/senior/preview/SeniorLocalPreviewClient.tsx modules/care/components/CareHubTileGrid.tsx 'app/(app)/care/page.tsx' 'app/(app)/care/preview/page.tsx' modules/care/components/consent/CareConsentNotice.tsx modules/care/components/consent/CareDisclaimer.tsx modules/care/components/sos/CareAlarmProvider.tsx modules/care/hooks/useAlarm.ts 'app/(app)/care/consent/page.tsx' 'app/(app)/care/consent/preview/page.tsx' 'app/(app)/care/consent/preview/CareConsentLocalPreviewClient.tsx' lib/closed-pilot.ts lib/local-ui-preview.ts --no-warn-ignored
npx tsc --noEmit
npm run build:local
```

Ergebnis:

- Vitest: 10 Dateien / 46 Tests passed.
- ESLint: passed.
- TypeScript: passed.
- `build:local`: passed.
- `build:local` baut die neuen Routen `/senior/preview`, `/care/preview`, `/care/consent/preview`.

Build-Hinweis:

- `STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert` erschien wie gewohnt mehrfach im lokalen Build.
- Kein Build-Fehler.

## Browser-Smoke lokal

Genutzt:

- Vorhandener Dev-Server auf `http://localhost:3000`, PID `57180`.
- Kein neuer Server auf Port 3003, weil Next.js im gleichen Projekt bereits einen laufenden Dev-Server blockiert.
- Playwright-CLI mit Mobile-Viewport `390x844`.

Gepruefte Routen:

- `http://localhost:3000/senior/preview`
- `http://localhost:3000/care/preview`
- `http://localhost:3000/care/consent/preview`

Ergebnis finaler Smoke:

- Keine Console-Warnings.
- Keine Console-Errors.
- Keine nicht-statischen 4xx/5xx Requests.
- Kein horizontaler Overflow im 390px-Mobile-Viewport.
- `/care/preview` feuert final keinen `/api/care/checkin/status`-Request mehr.
- `/care/consent/preview` zeigt `freiwilligen Einwilligung` und `jederzeit widerrufen`.
- `/senior/preview` zeigt Senior-Aktionen und Notruf `112`.

Zwischenfund im Browser:

- Erste Care-Preview rief ueber `CareAlarmProvider` noch `/api/care/checkin/status` auf und bekam `503`.
- Fix: `CareAlarmProvider`/`useAlarm({ disabled })` fuer Preview-Pfade.
- Danach finaler Browser-Smoke gruen.

## Lokale Reste

- Untracked bleibt weiter: `.codex-welle-d-3001.pid`
  - Schon aus vorherigem Welle-D-Block vorhanden.
  - Nicht geloescht.
- Der vorhandene Dev-Server auf Port 3000 lief bereits und laeuft weiter:
  - PID bei Uebergabe: `57180`
  - Nicht gestoppt.
- Kurzzeitig erzeugte Logdateien:
  - `output/codex-dev-3003.out.log`
  - `output/codex-dev-3003.err.log`
  - `output/` ist nicht Teil des Git-Status; keine Repo-Aenderung.

## Naechster sinnvoller Block

1. Thomas kann lokal direkt die Preview-Routen ansehen:
   - `http://localhost:3000/senior/preview`
   - `http://localhost:3000/care/preview`
   - `http://localhost:3000/care/consent/preview`
2. Wenn echte geschuetzte Routen geprueft werden sollen:
   - Frische synthetische Test-Auth herstellen, aber weiterhin ohne Care-Daten-Seeding.
   - Dann authentifizierter lokaler Browser-Spot-Check:
     - `/senior`
     - `/senior/home`
     - `/care`
     - `/care/consent`
3. Optional spaeter mit Thomas-Go:
   - `.codex-welle-d-3001.pid` lokal entfernen.
4. Weiterhin kein Push, kein Deploy, keine Prod-DB, keine Prod-Migration und keine Feature-Flags ohne neues explizites Go.

