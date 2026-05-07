# W3g municipal_config Listen-Array-Guards

Datum: 2026-05-07

## Ziel

Der Quartier-Info-API-Vertrag muss Listen immer als Arrays liefern. Kaputte
oder historisch manuell gepflegte JSONB-Werte in `municipal_config` duerfen
nicht als Objekt bis zum Client durchrutschen.

Betroffene Felder in diesem lokalen Schritt:

- `service_links`
- `apotheken`
- `events`
- `oepnv_stops`

## Pre-Check

Codebase-weit wurden bestehende `municipal_config`-Reads und Array-Guards
gesucht. Es existierte bereits `toServiceLinkArray` in
`lib/municipal/default-service-links.ts`; deshalb wurde kein neuer Service
oder keine neue Infrastruktur gebaut, sondern dieser vorhandene Guard
generisch erweitert.

## Umsetzung

- `toMunicipalConfigArray<T>(value)` als generischer JSONB-Listen-Guard
  ergaenzt.
- `toServiceLinkArray` nutzt den generischen Guard weiter.
- `getQuartierInfo` normalisiert `apotheken`, `events` und `oepnv_stops` mit
  demselben Guard.
- Nicht-Array-Werte werden wie leere Listen behandelt.
- Gueltige Arrays bleiben unveraendert.

## TDD

RED:

```powershell
npx vitest run __tests__/lib/quartier-info.service.test.ts
```

Erwarteter Fehler vor der Umsetzung:

```text
expected { name: 'Kaputter Apotheken-Wert' } to deeply equal []
```

GREEN:

```powershell
npx vitest run __tests__/lib/quartier-info.service.test.ts
npx vitest run __tests__/lib/quartier-info.service.test.ts __tests__/lib/municipal/default-service-links.test.ts
```

Ergebnis:

- Quartier-Info-Service: 6/6 Tests gruen.
- Quartier-Info-Service + Municipal-Helper: 11/11 Tests gruen.

## Verifikation

```powershell
npx vitest run __tests__/lib/quartier-info.service.test.ts __tests__/lib/municipal/default-service-links.test.ts
npx eslint lib/services/quartier-info.service.ts lib/municipal/default-service-links.ts __tests__/lib/quartier-info.service.test.ts __tests__/lib/municipal/default-service-links.test.ts
npx tsc --noEmit
git diff --check
npm run build
```

Ergebnis:

- Vitest: 2 Testdateien, 11/11 Tests gruen.
- Gezieltes ESLint: gruen.
- TypeScript: gruen.
- Diff-Check: gruen, nur bekannte CRLF-Hinweise.
- Build: gruen, nur bekannte lokale Warnung `STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert`.

## Grenzen

- Keine Migration.
- Kein Prod-DB-Schreiben.
- Kein Push.
- Kein Deploy.
- Keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung.
