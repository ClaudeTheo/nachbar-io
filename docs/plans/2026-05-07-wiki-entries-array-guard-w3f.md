# W3f wiki_entries JSONB Array-Guard

Datum: 2026-05-07

## Ziel

`municipal_config.wiki_entries` ist JSONB und wird auf der Seite `/city-services` gemappt. Wenn durch Drift oder fehlerhafte Pflege kein Array vorliegt, darf die Wiki-Ansicht nicht mit `.map is not a function` brechen.

## Pre-Check

Gefunden und genutzt:

- `app/(app)/city-services/page.tsx`: liest `config.wiki_entries` und normalisiert Bad-Saeckingen-Links.
- `__tests__/app/city-services/page.test.tsx`: bestehende Page-Testabdeckung mit Supabase-Mock.
- `lib/municipal/bad-saeckingen-links.ts`: bestehende `normalizeBadSaeckingenWikiEntries`.

Nicht dupliziert:

- keine neue Wiki-Infrastruktur,
- keine neue DB-Struktur,
- keine Migration,
- keine externe Quelle.

## Umsetzung

- `config.wiki_entries` wird vor der Normalisierung per `Array.isArray` geprueft.
- Nicht-Array-Werte werden wie eine leere Liste behandelt.
- Die Wiki-Ansicht zeigt dann den bestehenden Leerzustand statt eines Runtime-Fehlers.

## Verifikation

```powershell
npx vitest run __tests__/app/city-services/page.test.tsx
npx eslint app/(app)/city-services/page.tsx __tests__/app/city-services/page.test.tsx
npx tsc --noEmit
git diff --check
npm run build
```

RED: Nicht-Array-`wiki_entries` warf vorher `entries.map is not a function`.

GREEN: City-Services-Suite 59/59 gruen. ESLint, TypeScript, Diff-Check und Build gruen. Build nur mit bekannter lokaler Warnung `STRIPE_SECRET_KEY nicht konfiguriert`.

Keine Push-/Deploy-/Prod-/Vercel-Env-/Secret-Aktion.
