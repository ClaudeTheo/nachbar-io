# Deutscher Store-Alias fuer Kontoloeschung - 2026-05-03

## Ziel

Die Google-Play-/Store-Pflichtseite zur Kontoloeschung war bereits unter
`/account-loeschen` vorhanden. Fuer deutsche Nutzer und Store-Reviewer wurde
ein sprechender Alias `/konto-loeschen` ergaenzt.

## Pre-Check

Ausgefuehrt:

```powershell
rg -n "account-loeschen|datenschutz|impressum|agb|barrierefreiheit|Store-Pflichtseiten|public" __tests__ lib app docs
```

Ergebnis:

- Bestehende Loeschseite: `app/account-loeschen/page.tsx`
- Bestehende Middleware-Allowlist: `lib/supabase/middleware.ts`
- Bestehende Middleware-Tests: `__tests__/lib/supabase/middleware.test.ts`
- Kein Neubau der Loeschlogik noetig.

## Umsetzung

- `app/konto-loeschen/page.tsx` leitet auf `/account-loeschen`.
- `lib/supabase/middleware.ts` erlaubt `/konto-loeschen` ohne Auth.
- Middleware-Test deckt Store-Pflichtseiten inklusive `/konto-loeschen` ab.
- Route-Test deckt das Redirect-Ziel ab.

## Verifikation

RED:

```powershell
npx vitest run __tests__/lib/supabase/middleware.test.ts
```

Ergebnis: 1 Test failed, weil `/konto-loeschen` noch auf Login redirectete.

GREEN:

```powershell
npx vitest run __tests__/lib/supabase/middleware.test.ts __tests__/app/konto-loeschen/page.test.ts
npx eslint app/konto-loeschen/page.tsx __tests__/app/konto-loeschen/page.test.ts lib/supabase/middleware.ts __tests__/lib/supabase/middleware.test.ts --no-warn-ignored
npx tsc --noEmit
git diff --check
npm run build
```

Ergebnis:

- Vitest: 2 files, 17 tests passed
- ESLint: exit 0
- TypeScript: exit 0
- `git diff --check`: exit 0, nur LF/CRLF-Hinweise
- `npm run build`: exit 0, Route `/konto-loeschen` in der Route-Liste sichtbar

## Grenzen

- Keine Prod-DB-Schreibaktion.
- Keine Vercel-Env-Aenderung.
- Keine neuen Kosten oder Abhaengigkeiten.
- Keine echten personenbezogenen Daten verarbeitet.
