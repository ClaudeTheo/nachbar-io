# W3c Rathaus-URL-Defaults in Quartier-Info

Datum: 2026-05-07

## Ziel

Quartier-Info soll bei neuen Staedten nicht mit leerer Rathaus-Sektion starten, wenn `municipal_config.service_links` leer ist, aber `municipal_config.rathaus_url` bereits gepflegt wurde. Der Schritt nutzt den bestehenden lokalen Default-Link-Generator und bleibt ohne externe Recherche.

## Pre-Check

Gefunden und genutzt:

- `lib/services/quartier-info.service.ts`: zentrale Quartier-Info-Aggregation, liest `municipal_config.service_links`.
- `lib/municipal/default-service-links.ts`: lokaler Generator aus Stadtname + Rathaus-URL.
- `lib/municipal/bad-saeckingen-links.ts` und `modules/info-hub/services/rathaus-links.ts`: bestehende Bad-Saeckingen-Kurierung.
- `municipal_config.rathaus_url`: bestehende DB-Spalte in Typen und Migrationen.

Nicht dupliziert:

- keine neue `municipal_config`-Struktur,
- keine neue externe Quelle,
- keine OpenPLZ-/HTTP-Anbindung,
- keine Migration.

## Umsetzung

- `getQuartierInfo` selektiert nun `rathaus_url` aus `municipal_config`.
- Vorrang bleibt:
  1. konfigurierte `service_links`,
  2. kuratierte Bad-Saeckingen-Links,
  3. konservative Defaults aus `city_name` + `rathaus_url`.
- Wenn keine Rathaus-URL vorhanden ist, bleiben andere Staedte weiterhin leer.

## Verifikation

```powershell
npx vitest run __tests__/lib/quartier-info.service.test.ts
npx vitest run __tests__/lib/quartier-info.service.test.ts __tests__/lib/municipal/default-service-links.test.ts __tests__/lib/municipal/bad-saeckingen-links.test.ts
npx eslint lib/services/quartier-info.service.ts lib/municipal/default-service-links.ts __tests__/lib/quartier-info.service.test.ts __tests__/lib/municipal/default-service-links.test.ts
npx tsc --noEmit
git diff --check
npm run build
```

Erster RED-Nachweis: Laufenburg mit `rathaus_url`, aber leeren `service_links`, lieferte vorher `rathaus: []`.

Ergebnis nach Umsetzung: gruen. Build nur mit bekannter lokaler Warnung `STRIPE_SECRET_KEY nicht konfiguriert`.

Keine Push-/Deploy-/Prod-/Vercel-Env-/Secret-Aktion.
