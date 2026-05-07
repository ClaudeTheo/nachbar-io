# W3h Quartier-Info Client-Response-Normalisierung

Datum: 2026-05-07

## Ziel

Die Quartier-Info-Hauptseite und die InfoBar sollen nicht direkt auf
ungepruefte API-Rohdaten rendern. Selbst wenn ein altes Deployment, Cache oder
manuell driftende Daten Nicht-Array-Werte liefert, duerfen UI und Vorlesen
nicht mit `.map`/Index-Zugriffen oder `buildDailyBrief` abstuerzen.

## Pre-Check

Gesucht wurden vorhandene `QuartierInfoResponse`-Nutzungen, `buildDailyBrief`,
`waste_next`, `apotheken`, `events`, `oepnv` und verwandte API-Listen. Es gab
keinen zentralen Client-Normalizer; die Hauptseite setzte die Fetch-Antwort
direkt in den State, die InfoBar ebenfalls.

## Umsetzung

- Neuer reiner Helper `normalizeQuartierInfoResponse`.
- Listenfelder werden vor UI/TTS auf Arrays normalisiert:
  - `nina`
  - `waste_next`
  - `rathaus`
  - `oepnv`
  - `apotheken`
  - `events`
- OePNV-`departures` werden pro Haltestelle ebenfalls auf Arrays normalisiert.
- URL-Felder `notdienst_url` und `events_calendar_url` werden bei falschem Typ
  auf leere Strings gesetzt.
- `/quartier-info` nutzt den Normalizer direkt nach erfolgreichem Fetch.
- `InfoBar` nutzt denselben Normalizer.

## TDD

RED:

```powershell
npx vitest run __tests__/pages/quartier-info-vorlesen.test.tsx
```

Erwarteter Fehler vor der Umsetzung:

```text
TypeError: Cannot read properties of undefined (reading 'severity')
```

Ursache: `buildDailyBrief` erhielt eine Nicht-Array-Warnliste und griff auf
`nina[0].severity` zu.

GREEN:

```powershell
npx vitest run __tests__/pages/quartier-info-vorlesen.test.tsx __tests__/modules/info-hub/normalize-response.test.ts
```

Ergebnis:

- 2 Testdateien, 11/11 Tests gruen.

## Verifikation

```powershell
npx eslint 'app/(app)/quartier-info/page.tsx' modules/info-hub/components/InfoBar.tsx modules/info-hub/normalize-response.ts __tests__/pages/quartier-info-vorlesen.test.tsx __tests__/modules/info-hub/normalize-response.test.ts
npx tsc --noEmit
git diff --check
npm run build
```

Ergebnis:

- Gezieltes ESLint: gruen.
- TypeScript: gruen.
- Diff-Check: gruen, nur bekannte CRLF-Hinweise.
- Build: gruen, nur bekannte lokale Warnung `STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert`.

## Grenzen

- Keine Migration.
- Kein Prod-DB-Schreiben.
- Kein Push.
- Kein Deploy.
- Keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung.
