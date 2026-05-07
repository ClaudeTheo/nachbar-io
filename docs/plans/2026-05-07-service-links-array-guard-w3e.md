# W3e service_links JSONB Array-Guard

Datum: 2026-05-07

## Ziel

`municipal_config.service_links` ist JSONB und soll in den UI/API-Pfaden robust wie eine Liste behandelt werden. Wenn durch Drift oder fehlerhafte Pflege kein Array vorliegt, darf kein `.map is not a function` entstehen. Nicht-Array-Werte werden wie eine leere Liste behandelt und koennen dadurch weiter auf Rathaus-URL-Defaults fallen.

## Pre-Check

Gefunden und genutzt:

- `lib/services/quartier-info.service.ts`: API-Service mappt Rathauslinks.
- `app/(app)/city-services/page.tsx`: eigene Client-Logik fuer Service-Links.
- `lib/municipal/default-service-links.ts`: bestehender lokaler Rathaus-Default-Generator.
- Bestehende Tests fuer Quartier-Info-Service und City-Services-Seite.

Nicht dupliziert:

- keine neue DB-Struktur,
- keine Migration,
- keine neue externe Quelle,
- keine neue Service-Link-Infrastruktur.

## Umsetzung

- Neuer kleiner Helper `toServiceLinkArray(value)` gibt nur fuer echte Arrays eine `ServiceLink[]` zurueck.
- Quartier-Info-Service nutzt den Helper vor `toRathausLinks`.
- City-Services nutzt den Helper vor `normalizeBadSaeckingenServiceLinks`.
- Nicht-Array-`service_links` faellt dadurch auf bestehende Rathaus-URL-Defaults zurueck.

## Verifikation

```powershell
npx vitest run __tests__/lib/quartier-info.service.test.ts
npx vitest run __tests__/app/city-services/page.test.tsx
npx vitest run __tests__/lib/quartier-info.service.test.ts __tests__/app/city-services/page.test.tsx __tests__/lib/municipal/default-service-links.test.ts
npx eslint lib/services/quartier-info.service.ts app/(app)/city-services/page.tsx lib/municipal/default-service-links.ts __tests__/lib/quartier-info.service.test.ts __tests__/app/city-services/page.test.tsx __tests__/lib/municipal/default-service-links.test.ts
npx tsc --noEmit
git diff --check
npm run build
```

RED: Beide Pfade warfen vorher `links.map is not a function`.

GREEN: Vitest 67/67, ESLint, TypeScript, Diff-Check und Build gruen. Build nur mit bekannter lokaler Warnung `STRIPE_SECRET_KEY nicht konfiguriert`.

Keine Push-/Deploy-/Prod-/Vercel-Env-/Secret-Aktion.
