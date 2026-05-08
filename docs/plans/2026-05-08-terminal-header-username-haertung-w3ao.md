# W3ao Terminal Header-UserName-Haertung

Datum: 2026-05-08 nachmittag

## Ziel

`TerminalHeader` soll direkte kaputte `data.userName`-Context-Werte nicht als
`, [object Object]` in der Begruessung anzeigen.

## Pre-Check

Code-Suche vor Umsetzung:

```powershell
rg -n "userName|greeting|display_name|caption|description|message|title|subtitle|label" components\terminal app\terminal lib\terminal components\terminal\__tests__ __tests__\app\terminal
```

Ergebnis:

- `lib/terminal/useTerminalData.ts` normalisiert `userName` bereits beim
  Device-Status.
- `TerminalHeader` kann aber direkte kaputte Context-Werte rendern.
- Kein neuer Service/Adapter; lokale Anzeigegrenze im bestehenden Header.

## TDD

RED:

```powershell
npx vitest run components\terminal\__tests__\TerminalHeaderContextGuards.test.tsx
```

Fehlschlag wie erwartet:

- Begruessung zeigte `, [object Object]`.

GREEN:

```powershell
npx vitest run components\terminal\__tests__\TerminalHeaderContextGuards.test.tsx
```

Ergebnis: 2 Tests gruen.

## Aenderung

- Neuer Test:
  `components/terminal/__tests__/TerminalHeaderContextGuards.test.tsx`
- `TerminalHeader` rendert den Namen nur bei nicht-leerem String.
- Kaputte Namen werden wie fehlende Namen behandelt.

## Gates

Kein Push, kein Deploy, keine Prod-DB, keine Vercel-Env-/Secret-/Billing-/Auth-
Aenderung. Stripe/Billing bleibt bis zur GmbH wartend.
