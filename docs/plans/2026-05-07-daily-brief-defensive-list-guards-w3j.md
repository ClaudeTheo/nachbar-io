# W3j Daily-Brief defensive Listen-Guards

Datum: 2026-05-07

## Ziel

`buildDailyBrief` soll auch dann nicht crashen, wenn ein direkter Aufrufer
ungepruefte Partial-Daten uebergibt. Nicht-Array-Werte fuer Warnungen, Muell
und Events werden wie fehlende Quellen behandelt.

## Pre-Check

Gezielter Repo-Pre-Check in `nachbar-io/`:

```powershell
rg -n "buildDailyBrief|daily-brief|normalizeQuartierInfoResponse|wasteSentence|ninaSentence|eventsSentence|waste_next|nina|events" modules/voice modules/info-hub __tests__/lib/voice __tests__/modules/info-hub __tests__/pages/quartier-info-vorlesen.test.tsx
```

Gefunden:

- Bestehender Daily-Brief-Service:
  `modules/voice/services/daily-brief.service.ts`
- Bestehende Daily-Brief-Tests:
  `__tests__/lib/voice/daily-brief.service.test.ts`
- Bestehender allgemeiner Quartier-Info-Normalizer:
  `modules/info-hub/normalize-response.ts`

Entscheidung: Kein neuer Normalizer und keine neue Service-Schicht. Die
direkten Satz-Inputs in `buildDailyBrief` werden lokal defensiv auf Arrays
geprueft.

## Umsetzung

- `buildDailyBrief` normalisiert `data.nina`, `data.waste_next` und
  `data.events` mit `Array.isArray`.
- Nicht-Array-Werte laufen dadurch in die bestehenden Fallback-Saetze:
  keine Warnungen, keine Muelldaten, keine Veranstaltungsdaten.
- Die bestehenden Satz-Helper bleiben unveraendert.

## TDD

RED:

```powershell
npx vitest run __tests__/lib/voice/daily-brief.service.test.ts -t "Nicht-Array-Werte"
```

Der neue Test fiel erwartungsgemaess mit
`Cannot read properties of undefined (reading 'severity')` fehl.

GREEN:

```powershell
npx vitest run __tests__/lib/voice/daily-brief.service.test.ts -t "Nicht-Array-Werte"
```

Ergebnis: 1/1 Test gruen.

## Verifikation

Gruen:

```powershell
npx vitest run __tests__/lib/voice/daily-brief.service.test.ts
npx eslint modules/voice/services/daily-brief.service.ts __tests__/lib/voice/daily-brief.service.test.ts
git diff --check
npx tsc --noEmit
npm run build
```

Ergebnisse:

- Vitest: 20/20 Tests gruen.
- ESLint: gruen.
- `git diff --check`: gruen.
- `npx tsc --noEmit`: gruen.
- `npm run build`: gruen.

Bekannte Build-Warnung:

```text
STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert
```

## Gates

- Kein Push.
- Kein Deploy.
- Keine Prod-DB-Schreibaktion.
- Keine Migration.
- Keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung.
