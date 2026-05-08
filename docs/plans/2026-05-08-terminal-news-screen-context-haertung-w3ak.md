# Terminal NewsScreen-Context-Haertung W3ak

Datum: 2026-05-08 nachmittag

## Ziel

`NewsScreen` gegen direkte kaputte `data.news`-Context-Werte haerten. Auch wenn
ein unnormalisierter Runtime-Wert am Screen ankommt, darf die Ansicht nicht mit
`.map is not a function`, `null.id`, `Invalid Date` oder `NaN` scheitern.

## Pre-Check

Ausgefuehrt:

```powershell
rg -n "NewsScreen|timeAgo|publishedAt|news\]|news:" components\terminal __tests__\app\terminal __tests__\lib\terminal -S
Get-Content -Raw components\terminal\screens\NewsScreen.tsx
Get-Content -Raw __tests__\lib\terminal\useTerminalData.test.tsx
Get-Content -Raw lib\terminal\useTerminalData.ts
```

Ergebnis:

- Bestehende News-Normalisierung gefunden:
  - `normalizeNews` in `lib/terminal/useTerminalData.ts`
- `NewsScreen` nutzte `data?.news ?? []` direkt.
- Kein neuer Normalizer noetig. Umsetzung als Export und Wiederverwendung des
  bestehenden `normalizeNews`-Adapters.

## TDD

RED:

```powershell
npx vitest run components\terminal\__tests__\TerminalNewsScreenGuards.test.tsx
```

Erwartete rote Fehler:

- Objekt statt Array crashte mit `news.map is not a function`.
- `null` in der News-Liste crashte mit `Cannot read properties of null`.

GREEN:

- `normalizeNews` wird aus `useTerminalData.ts` exportiert.
- `NewsScreen` verwendet `normalizeNews(data?.news)`.
- Kaputte direkte Context-Listen werden wie leer behandelt.
- Kaputte Eintraege werden vor `NewsCard` gefiltert.

## Verifikation

Gruen:

```powershell
npx vitest run components\terminal\__tests__\TerminalNewsScreenGuards.test.tsx
npx vitest run components\terminal\__tests__\TerminalNewsScreenGuards.test.tsx __tests__\lib\terminal\useTerminalData.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx __tests__\app\terminal\page.test.tsx
npx eslint components\terminal\screens\NewsScreen.tsx components\terminal\__tests__\TerminalNewsScreenGuards.test.tsx lib\terminal\useTerminalData.ts __tests__\lib\terminal\useTerminalData.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

Build-Hinweis:

- `STRIPE_SECRET_KEY nicht konfiguriert - Zahlungen deaktiviert` ist erwartetes
  lokales Verhalten.

## Rote Gates

Kein Push, kein Deploy, keine Prod-DB-Schreibaktion, keine Prod-Migration,
keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung.

Stripe/Billing bleibt bis zur GmbH wartend.
