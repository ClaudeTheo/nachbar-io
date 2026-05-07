# W3n Info-Hub NINA-Warnungs-Normalisierung

Datum: 2026-05-07 abend
Repo: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`

## Ziel

`normalizeQuartierInfoResponse` soll falsch geformte NINA-Warnobjekte nicht als
halbgueltige API-/TTS-Daten weiterreichen. Insbesondere darf der Vorlesetext auf
`/quartier-info` keine `undefined`-Warnstufen oder kaputten Headlines aus
ungeprueften Partial-Daten erzeugen.

## Pre-Check

Ausgefuehrt:

```powershell
rg -n "NinaAlert|nina|normalizeQuartierInfoResponse|normalizeNina|severity|headline|description|warn" modules app lib __tests__
rg -n "nina\.|nina\[|warningSentence|Warnstufe|severity|headline" "app/(app)/quartier-info/page.tsx" modules/info-hub modules/voice __tests__/pages __tests__/lib/voice __tests__/modules/info-hub __tests__/api
```

Gefundene bestehende Infrastruktur:

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\modules\info-hub\normalize-response.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\modules\info-hub\types.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\modules\voice\services\daily-brief.service.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\modules\info-hub\normalize-response.test.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\api\quartier-info-route.test.ts`

Entscheidung: bestehende zentrale Response-Normalisierung erweitern, keine neue
Validator-Infrastruktur bauen.

## TDD

RED:

```powershell
npx vitest run __tests__/modules/info-hub/normalize-response.test.ts -t "filtert falsch geformte NINA"
```

Erwartet fehlgeschlagen: ungültige NINA-Objekte ohne `severity`, ohne
`headline` oder mit unbekannter Severity wurden vorher durchgereicht.

GREEN:

```powershell
npx vitest run __tests__/modules/info-hub/normalize-response.test.ts -t "filtert falsch geformte NINA"
```

Danach gruen: 1 Test passed.

## Umsetzung

- `normalizeNinaWarnings` in
  `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\modules\info-hub\normalize-response.ts`
  filtert Warnobjekte auf den bestehenden `NinaWarning`-Vertrag.
- Erlaubte Severity-Werte bleiben exakt die bestehenden Typwerte:
  `Extreme`, `Severe`, `Moderate`, `Minor`.
- Gueltige Warnungen bleiben unveraendert erhalten.
- Falsch geformte Warnungen werden entfernt und erzeugen dadurch keine
  `undefined`-Warnstufe im TTS-Text.

## Verifikation

Gruen:

```powershell
npx vitest run __tests__/modules/info-hub/normalize-response.test.ts __tests__/api/quartier-info-route.test.ts __tests__/pages/quartier-info-vorlesen.test.tsx __tests__/lib/voice/daily-brief.service.test.ts
```

Ergebnis: 4 Testdateien, 39 Tests gruen.

Ebenfalls gruen:

```powershell
npx eslint modules/info-hub/normalize-response.ts __tests__/modules/info-hub/normalize-response.test.ts app/api/quartier-info/route.ts __tests__/api/quartier-info-route.test.ts "app/(app)/quartier-info/page.tsx" __tests__/pages/quartier-info-vorlesen.test.tsx modules/voice/services/daily-brief.service.ts __tests__/lib/voice/daily-brief.service.test.ts
git diff --check
npx tsc --noEmit
npm run build
```

`git diff --check` meldete nur die bekannten CRLF-Hinweise. `npm run build`
meldete wie bekannt lokal `STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen
deaktiviert`, lief aber mit Exit 0 durch.

## Gates

Nicht gemacht:

- kein Push
- kein Deploy
- keine Prod-DB-Schreibaktion
- keine Prod-Migration
- keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung
