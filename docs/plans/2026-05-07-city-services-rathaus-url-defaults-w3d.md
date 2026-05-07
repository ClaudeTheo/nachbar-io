# W3d Rathaus-URL-Defaults in City-Services

Datum: 2026-05-07

## Ziel

Die Seite `Rathaus & Infos` (`/city-services`) soll dieselben konservativen Rathaus-Link-Defaults nutzen wie die Quartier-Info-API, wenn `municipal_config.service_links` leer ist, aber `municipal_config.rathaus_url` vorhanden ist.

## Pre-Check

Gefunden und genutzt:

- `app/(app)/city-services/page.tsx`: eigene Client-Logik fuer `municipal_config.service_links`.
- `__tests__/app/city-services/page.test.tsx`: bestehende Page-Tests mit Supabase-Mock.
- `lib/municipal/default-service-links.ts`: bestehender Generator aus Stadtname + Rathaus-URL.
- `lib/municipal/bad-saeckingen-links.ts`: bestehende Bad-Saeckingen-Normalisierung.

Nicht dupliziert:

- keine neue Service-Link-Infrastruktur,
- keine neue DB-Struktur,
- keine externe Recherche oder HTTP-Anbindung,
- keine Migration.

## Umsetzung

- Die City-Services-Seite nutzt weiterhin konfigurierte `service_links`, wenn vorhanden.
- Wenn die Liste leer ist, erzeugt sie Defaults aus `city_name` bzw. Quartiersstadt und `rathaus_url`.
- Die vorhandene Bad-Saeckingen-Normalisierung bleibt auf dem Ergebnis aktiv.

## Verifikation

```powershell
npx vitest run __tests__/app/city-services/page.test.tsx
npx eslint app/(app)/city-services/page.tsx __tests__/app/city-services/page.test.tsx lib/municipal/default-service-links.ts
npx tsc --noEmit
git diff --check
npm run build
```

RED: Laufenburg mit `rathaus_url`, aber leerer `service_links`-Liste zeigte vorher keine Quicklinks.

GREEN: Die Page-Suite laeuft mit 57/57 Tests gruen. ESLint, TypeScript, Diff-Check und Build sind gruen. Build nur mit bekannter lokaler Warnung `STRIPE_SECRET_KEY nicht konfiguriert`.

Keine Push-/Deploy-/Prod-/Vercel-Env-/Secret-Aktion.
