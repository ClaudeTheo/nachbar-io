# W3u Info-Hub Pollen-Intensity-Normalisierung

Datum: 2026-05-07 abend

## Ziel

`PollenData.pollen` im zentralen Info-Hub-Normalizer enger haerten, damit API
und UI keine Polleneintraege mit ungueltigen `today`-/`tomorrow`-Werten
weiterreichen.

Erlaubte Intensitaeten bleiben exakt:

```text
0 | 0.5 | 1 | 1.5 | 2 | 2.5 | 3
```

## Pre-Check

Ausgefuehrt vor Code-Aenderungen:

```powershell
rg -n "PollenData|normalizePollen|pollen|PollenIntensity|weather\.pollen|forecast" -S .
```

Ergebnis:

- Bestehende zentrale Infrastruktur gefunden:
  `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\modules\info-hub\normalize-response.ts`
- Bestehende Tests gefunden:
  `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\modules\info-hub\normalize-response.test.ts`
  und
  `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\api\quartier-info-route.test.ts`
- Entscheidung: Kein neuer Normalizer, sondern Adapter-Haertung in der
  bestehenden `normalizePollen`-Funktion.

## TDD

RED:

- Neuer Normalizer-Test zeigte, dass Eintraege mit `4`, `1.25` und `-0.5`
  bisher weitergereicht wurden.
- Neuer Route-Test zeigte denselben Fehler auf `/api/quartier-info`-Ebene.
- Der erste Route-Test war zunaechst zu weich mit `toMatchObject`; vor
  Produktionscode wurde er auf eine exakte `pollen`-Assertion verschaerft und
  korrekt rot verifiziert.

GREEN:

- `normalizePollen` nutzt jetzt einen lokalen `isPollenIntensity`-Guard.
- Ungueltige Polleneintraege werden aus der `pollen`-Map gefiltert.
- Gueltige Eintraege bleiben erhalten.
- Die Rueckgabe wird auf `{ region, pollen }` normalisiert.

## Geaenderte Dateien

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\modules\info-hub\normalize-response.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\modules\info-hub\normalize-response.test.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\api\quartier-info-route.test.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-07-info-hub-pollen-intensity-normalisierung-w3u.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\INBOX.md`

## Verifikation

Gezielt gruen:

```powershell
npx vitest run __tests__\modules\info-hub\normalize-response.test.ts
npx vitest run __tests__\api\quartier-info-route.test.ts
```

Breitere Verifikation siehe Session-Ausgabe:

```powershell
npx eslint modules\info-hub\normalize-response.ts __tests__\modules\info-hub\normalize-response.test.ts __tests__\api\quartier-info-route.test.ts
git diff --check
npx tsc --noEmit
npm run build
```

## Gates

Kein Push, kein Deploy, keine Prod-DB-Schreibaktion, keine Prod-Migration,
keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung.

Stripe/Billing bleibt bis zur angemeldeten GmbH wartend; Zahlungen bleiben
lokal deaktiviert.
