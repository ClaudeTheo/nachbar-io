# W3b Rathaus-Service-Link-Defaults lokal

Datum: 2026-05-07

## Ziel

Vor dem groesseren Stadt-Onboarding braucht die App einen kleinen, wiederverwendbaren Generator fuer kommunale Standard-Service-Links. Eingabe ist bewusst nur Stadtname + Rathaus-Website. Es gibt keine externe Recherche und keinen HTTP-Check.

## Pre-Check

Gefunden und genutzt:

- `lib/municipal/types.ts`: bestehender `ServiceLink`-Typ.
- `lib/municipal/bad-saeckingen-links.ts`: bestehende Sonderpfad-Normalisierung.
- `supabase/migrations/100_municipal_seed_bad_saeckingen.sql` und `127_laufenburg_config_sample_events.sql`: historische Seed-Muster fuer Service-Links.

Nicht dupliziert:

- keine neue `municipal_config`-Struktur,
- keine OpenPLZ-/HTTP-Anbindung,
- keine neue Migration.

## Umsetzung

- `normalizeMunicipalWebsiteUrl` normalisiert Domains auf HTTPS und entfernt trailing slashes.
- `buildMunicipalServiceLinks` erzeugt konservative Defaults:
  - Rathaus,
  - Buergerbuero,
  - Formulare & Antraege,
  - Veranstaltungskalender,
  - Abfallwirtschaft.
- Bad-Saeckingen-Sonderpfade laufen durch die vorhandene Normalisierung.
- Export ueber `lib/municipal/index.ts`.

## Verifikation

```powershell
npx vitest run __tests__/lib/municipal/default-service-links.test.ts
npx eslint lib/municipal/default-service-links.ts lib/municipal/index.ts __tests__/lib/municipal/default-service-links.test.ts
npx tsc --noEmit
git diff --check
npm run build
```

Ergebnis: gruen. Keine Push-/Deploy-/Prod-/Vercel-Env-/Secret-Aktion.
