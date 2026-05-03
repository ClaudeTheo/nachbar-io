# Konto-Loeschen Sitemap Alias - 2026-05-03

## Ziel

Der neu ergaenzte deutsche Store-/Reviewer-Pfad `/konto-loeschen` soll nicht
nur als Route existieren, sondern auch in der Sitemap und in der Google-Play-
Listing-Doku sichtbar sein.

## Pre-Check

Ausgefuehrt:

```powershell
rg -n "sitemap\(|MetadataRoute\.Sitemap|account-loeschen|konto-loeschen|sitemap" __tests__ app docs
```

Ergebnis:

- Sitemap existiert in `app/sitemap.ts`.
- `/account-loeschen` war bereits enthalten.
- `/konto-loeschen` war noch nicht enthalten.
- Es gab noch keinen Sitemap-Test.

## Umsetzung

- `__tests__/app/sitemap.test.ts` prueft beide Kontoloesch-Pfade.
- `app/sitemap.ts` enthaelt jetzt `/konto-loeschen`.
- `docs/google-play-listing.md` nennt den deutschen Alias in Metadaten und
  Review Notes.

## Verifikation

RED:

```powershell
npx vitest run __tests__/app/sitemap.test.ts
```

Ergebnis: 1 Test failed, weil `/konto-loeschen` in der Sitemap fehlte.

GREEN:

```powershell
npx vitest run __tests__/app/sitemap.test.ts
npx eslint app/sitemap.ts __tests__/app/sitemap.test.ts --no-warn-ignored
npx tsc --noEmit
git diff --check
npm run build
```

Ergebnis:

- Vitest: 1 passed
- ESLint: exit 0
- TypeScript: exit 0
- `git diff --check`: exit 0, nur LF/CRLF-Hinweise
- `npm run build`: exit 0

## Grenzen

- Keine Prod-DB-Schreibaktion.
- Keine Vercel-Env-Aenderung.
- Keine neuen Abhaengigkeiten oder laufenden Kosten.
- Keine echten personenbezogenen Daten verarbeitet.
