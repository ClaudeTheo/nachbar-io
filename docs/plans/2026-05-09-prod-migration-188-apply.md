# Prod-Migration 188: municipal_config.sync_meta angewendet

Datum: 2026-05-09
Owner: Codex
Scope: Production-DB, Migration 188, kein Secrets-/Billing-/Vercel-Env-Change.

## Founder-Go

Thomas gab in dieser Session den exakten Go-Satz:

```text
MIGRATION-PROD-GO-188
```

Zusatzauftrag: zuerst pruefen, ob der Schritt sinnvoll ist; falls ja, die
sinnvollen Folgeaktionen ausfuehren.

## Sinncheck

Mig 188 war sinnvoll, weil der aktuelle Runtime-Code in den Quartier-Info-Syncs
`municipal_config.sync_meta` bereits liest und schreibt:

- `modules/info-hub/services/osm-poi-sync.service.ts`
- `modules/info-hub/services/quartier-events-sync.service.ts`

Ohne Prod-Spalte waeren diese Sync-Pfade auf Production nicht migrationskompatibel.

## Preflight

Ausgefuehrt:

```powershell
npx supabase db query --linked --output table "select version, name from supabase_migrations.schema_migrations where version = '188';"
npx supabase db query --linked --output table "select column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema = 'public' and table_name = 'municipal_config' and column_name = 'sync_meta';"
npx supabase db query --linked --output table "select count(*)::int as municipal_config_rows from public.municipal_config;"
npx supabase db query --linked --output table "select column_name from information_schema.columns where table_schema = 'public' and table_name = 'users' and column_name in ('is_test_user','is_tester');"
npx supabase db query --linked --output table "select count(*)::int as real_users from public.users where coalesce(is_tester, false) is not true;"
```

Befund:

- `schema_migrations` hatte vor Apply keinen Eintrag fuer `188`.
- `municipal_config.sync_meta` fehlte vor Apply.
- `municipal_config` war erreichbar und hatte 5 Rows.
- In Prod heisst der Testnutzer-Indikator `users.is_tester`.
- Realnutzer-Auto-Stop: 0 Nicht-Testnutzer.

## Apply

Ausgefuehrt:

```powershell
npx supabase db query --linked --file "supabase\migrations\188_municipal_config_sync_meta.sql"
npx supabase migration repair --linked --status applied 188
```

Ergebnis:

- SQL-Datei erfolgreich angewendet.
- Migration-History repariert: `[188] => applied`.

## Verification

Ausgefuehrt:

```powershell
npx supabase db query --linked --output table "select version, name, array_length(statements, 1) as statements from supabase_migrations.schema_migrations where version = '188';"
npx supabase db query --linked --output table "select column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema = 'public' and table_name = 'municipal_config' and column_name = 'sync_meta';"
npx supabase db query --linked --output table "select count(*)::int as rows_total, count(*) filter (where sync_meta is null)::int as null_sync_meta from public.municipal_config;"
```

Ergebnis:

- `schema_migrations`: Version `188`, Name `municipal_config_sync_meta`, 2 Statements.
- `municipal_config.sync_meta`: `jsonb`, `NOT NULL`, Default `'{}'::jsonb`.
- Bestehende `municipal_config`-Rows: 5 total, 0 mit `sync_meta IS NULL`.
- Spaltenkommentar gesetzt.

## Lokale Verifikation danach

Ausgefuehrt:

```powershell
npx vitest run __tests__/modules/info-hub/osm-pharmacy-sync.test.ts __tests__/modules/info-hub/quartier-events-sync.test.ts __tests__/lib/municipal-config-sync-meta-migration.test.ts __tests__/lib/migration-versions.test.ts app/api/cron/osm-poi-sync/route.test.ts app/api/cron/quartier-events-sync/route.test.ts
git diff --check
npx tsc --noEmit
npm run lint
npm run build
```

Ergebnis:

- Vitest: 6 Testdateien, 18 Tests gruen.
- `git diff --check`: gruen.
- TypeScript: gruen.
- ESLint: gruen.
- Next Build: gruen.

## Grenzen

- Keine Vercel-Env-/Secret-/Billing-Aenderung.
- Kein Stripe/Billing-Live-Setup; bleibt bis zur GmbH wartend.
- Keine neuen laufenden Kosten.
