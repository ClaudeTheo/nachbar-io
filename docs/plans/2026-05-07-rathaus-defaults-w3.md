# W3 Rathaus-Defaults fuer Quartier-Info

Datum: 2026-05-07

## Ziel

Die Quartier-Info-Seite soll fuer Bad Saeckingen nicht mit leerer Rathaus-Sektion starten, wenn `municipal_config.service_links` leer ist. Bestehende kuratierte Links sollen als lokaler Fallback dienen.

## Pre-Check

Gefunden und genutzt, keine neue Infrastruktur gebaut:

- `modules/info-hub/services/rathaus-links.ts`: kuratierte Bad-Saeckingen-Rathauslinks.
- `lib/municipal/bad-saeckingen-links.ts`: Normalisierung alter Bad-Saeckingen-URLs.
- `lib/services/quartier-info.service.ts`: liest `municipal_config.service_links`.
- `supabase/migrations/100_municipal_seed_bad_saeckingen.sql`: historische Service-Links im Seed.

## Umsetzung

- `getQuartierInfo` liest jetzt `city_name` aus `municipal_config`.
- Wenn `service_links` leer ist und die Stadt Bad Saeckingen ist, nutzt der Service die bestehenden `RATHAUS_LINKS`.
- Vorhandene `service_links` aus der DB bleiben vorrangig und werden nur weiter normalisiert.
- Andere Staedte bekommen keinen Bad-Saeckingen-Fallback.

Keine neue externe API, keine neue DB-Spalte, keine Migration, kein Prod-DB-Schreiben, kein Push, kein Deploy.

## Verifikation

```powershell
npx vitest run __tests__/lib/quartier-info.service.test.ts
npx vitest run __tests__/lib/quartier-info.service.test.ts __tests__/lib/municipal/bad-saeckingen-links.test.ts __tests__/api/quartier-info-route.test.ts __tests__/pages/quartier-info-vorlesen.test.tsx
npx eslint lib/services/quartier-info.service.ts __tests__/lib/quartier-info.service.test.ts
npx tsc --noEmit
git diff --check
npm run build
```

Ergebnis: gruen. `git diff --check` meldet nur die bekannte CRLF-Warnung fuer die beruehrte Service-Datei. `npm run build` ist gruen; lokale Warnung: `STRIPE_SECRET_KEY nicht konfiguriert`.
