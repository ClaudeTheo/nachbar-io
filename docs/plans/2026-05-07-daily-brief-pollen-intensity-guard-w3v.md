# W3v Daily-Brief Pollen-Intensity-Guard

Datum: 2026-05-07 abend

## Ziel

`buildDailyBrief` soll kaputte Pollendaten mit ungueltigen
`today`-/`tomorrow`-Intensitaeten nicht vorlesen. Solche Werte werden wie
fehlende Pollendaten behandelt.

Erlaubte Intensitaeten bleiben:

```text
0 | 0.5 | 1 | 1.5 | 2 | 2.5 | 3
```

## Pre-Check

Ausgefuehrt vor Code-Aenderungen:

```powershell
rg -n "POLLEN_TYPES|PollenData|PollenIntensity|normalizePollen|Object\.entries\(data\.pollen\.pollen\)|Object\.entries\(pollen\.pollen\)|topPollen|pollenSentence|pollen-client" -S modules app lib __tests__ docs\plans
```

Ergebnis:

- Bestehender Daily-Brief-Guard gefunden:
  `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\modules\voice\services\daily-brief.service.ts`
- Bestehende Tests gefunden:
  `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\lib\voice\daily-brief.service.test.ts`
- Entscheidung: Kein neuer Guard-Service, sondern Adapter-Haertung im
  bestehenden `isPollenData` von `buildDailyBrief`.

## TDD

RED:

- Neuer Test mit `Birke: { today: 4, tomorrow: 1 }` und
  `Graeser: { today: 1.25, tomorrow: 1.5 }`.
- Vor der Aenderung las `buildDailyBrief` daraus
  `Beim Pollenflug ist Birke heute auf Stufe hoch.`

GREEN:

- `isPollenData` akzeptiert nur noch Eintraege mit gueltigem `today` und
  gueltigem `tomorrow`.
- Ungueltige Pollen-Payloads fallen in den bestehenden Fallback:
  `Zum Pollenflug habe ich gerade keine Daten.`

## Geaenderte Dateien

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\modules\voice\services\daily-brief.service.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\lib\voice\daily-brief.service.test.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-07-daily-brief-pollen-intensity-guard-w3v.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\INBOX.md`

## Verifikation

Gezielt gruen:

```powershell
npx vitest run __tests__\lib\voice\daily-brief.service.test.ts
```

Breitere Verifikation:

```powershell
npx eslint modules\voice\services\daily-brief.service.ts __tests__\lib\voice\daily-brief.service.test.ts
git diff --check
npx tsc --noEmit
npm run build
```

## Gates

Kein Push, kein Deploy, keine Prod-DB-Schreibaktion, keine Prod-Migration,
keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung.

Stripe/Billing bleibt bis zur angemeldeten GmbH wartend; Zahlungen bleiben
lokal deaktiviert.
