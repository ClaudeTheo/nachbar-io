# W3k Daily-Brief Weather/Pollen-Guards

Datum: 2026-05-07

## Ziel

`buildDailyBrief` soll bei falsch geformten Wetter- oder Pollendaten keine
falschen Fakten vorlesen und nicht crashen. Kaputte Partial-Daten werden wie
fehlende Quellen behandelt.

## Pre-Check

Gezielter Repo-Pre-Check in `nachbar-io/`:

```powershell
rg -n "weatherSentence|pollenSentence|buildDailyBrief|QuartierWeather|PollenData|undefined Grad|Pollenflug" modules/voice modules/info-hub __tests__/lib/voice __tests__/modules/info-hub
```

Gefunden:

- Weather-/Pollen-Satzlogik in
  `modules/voice/services/daily-brief.service.ts`
- Bestehende Tests in
  `__tests__/lib/voice/daily-brief.service.test.ts`
- Allgemeiner Info-Hub-Normalizer in
  `modules/info-hub/normalize-response.ts`

Entscheidung: Kein neuer Normalizer. `buildDailyBrief` validiert seine direkten
Weather-/Pollen-Inputs lokal vor dem Satzbau.

## Umsetzung

- Neuer Guard `isQuartierWeather` akzeptiert nur Weather-Objekte mit
  `temp: number | null` und `description: string`.
- Neuer Guard `isPollenData` akzeptiert nur Pollen-Objekte mit Objekt-Map und
  numerischen `today`-Werten.
- Falsch geformte Werte werden als `null` an die bestehenden Fallback-Saetze
  uebergeben.

## TDD

RED:

```powershell
npx vitest run __tests__/lib/voice/daily-brief.service.test.ts -t "falsch geformte Wetter"
```

Der neue Test fiel erwartungsgemaess, weil der Brief
`Heute ist es kaputt bei undefined Grad.` und faelschlich
`Heute ist kaum Pollenflug.` erzeugte.

GREEN:

```powershell
npx vitest run __tests__/lib/voice/daily-brief.service.test.ts -t "falsch geformte Wetter"
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

- Vitest: 21/21 Tests gruen.
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
