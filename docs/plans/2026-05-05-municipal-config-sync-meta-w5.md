# W5 lokal: municipal_config.sync_meta fuer Quartier-Info

Datum: 2026-05-05
Owner: Codex
Scope: lokal, kein Push, keine Prod-DB, keine Prod-Migration, keine Vercel-Env-Aenderung, keine Secrets.

## Ziel

Der lokale OSM-Apotheken-Sync schreibt neben `municipal_config.apotheken` auch nachvollziehbare Sync-Metadaten nach `municipal_config.sync_meta.apotheken`.

## Pre-Check

Ausgefuehrt:

```powershell
rg -n "sync_meta|auto_sync_status|last_synced_at|data_source|municipal_config" supabase/migrations lib modules app __tests__
rg --files supabase/migrations | Sort-Object
rg -n "osm-poi-sync|OsmPoi|runOsmPoiSync|apotheken" modules app __tests__ docs/plans/handoff/INBOX.md
rg -n "municipal_config" lib/supabase/database.types.ts
```

Befund:

- `sync_meta`, `auto_sync_status`, `last_synced_at`, `data_source` existierten noch nicht als kommunale Sync-Metafelder.
- Bestehende Infrastruktur fuer `municipal_config` und `modules/info-hub/services/osm-poi-sync.service.ts` existierte und wurde adaptiert, nicht dupliziert.
- Migration `188` war frei; `178`, `186` und `187` sind bereits belegt. Mig `178` bleibt weiterhin defer'ed.

## TDD

RED:

```powershell
npx vitest run __tests__/modules/info-hub/osm-pharmacy-sync.test.ts __tests__/lib/municipal-config-sync-meta-migration.test.ts
```

Erwartet fehlgeschlagen:

- Migration `188_municipal_config_sync_meta.sql` fehlte.
- Erfolgreicher OSM-Sync schrieb noch kein `sync_meta.apotheken`.
- Overpass-Fehler schrieb noch keinen Fehlerstatus in `sync_meta.apotheken`.

GREEN:

```powershell
npx vitest run __tests__/modules/info-hub/osm-pharmacy-sync.test.ts __tests__/lib/municipal-config-sync-meta-migration.test.ts
```

Ergebnis: 2 Testdateien, 6 Tests passed.

## Umsetzung

- `supabase/migrations/188_municipal_config_sync_meta.sql`
  - `public.municipal_config.sync_meta JSONB NOT NULL DEFAULT '{}'::jsonb`
  - Spaltenkommentar fuer Quellen-Metadaten.
- `supabase/rollbacks/188_municipal_config_sync_meta.down.sql`
  - lokales Rollback-Gegenstueck.
- `lib/supabase/database.types.ts`
  - `municipal_config.Row/Insert/Update` um `sync_meta` ergaenzt.
- `modules/info-hub/services/osm-poi-sync.service.ts`
  - liest `apotheken, sync_meta`.
  - schreibt `sync_meta.apotheken` mit `status`, `source`, `last_synced_at`, `found_count`, `written_count`, `manual_preserved_count`, `error`.
  - erhaelt andere Meta-Zweige wie `sync_meta.events`.
  - schreibt bei Quartier-Fehlern moeglichst `status: "error"` in `sync_meta.apotheken`, sofern `municipal_config` geladen werden konnte.

## Verifikation

Ausgefuehrt:

```powershell
npx vitest run __tests__/modules/info-hub/osm-pharmacy-sync.test.ts app/api/cron/osm-poi-sync/route.test.ts __tests__/lib/municipal-config-sync-meta-migration.test.ts __tests__/lib/migration-versions.test.ts
npx eslint "modules/info-hub/services/osm-poi-sync.service.ts" "__tests__/modules/info-hub/osm-pharmacy-sync.test.ts" "__tests__/lib/municipal-config-sync-meta-migration.test.ts" "lib/supabase/database.types.ts" "app/api/cron/osm-poi-sync/route.test.ts"
npx tsc --noEmit
```

Ergebnis:

- Vitest: 4 Testdateien, 11 Tests passed.
- ESLint: gruen.
- TypeScript: gruen.

## Grenzen

- Keine Prod-DB-Schreibaktion.
- Migration 188 nur als lokale Datei vorbereitet, nicht auf Prod angewendet.
- Migration 178 weiter defer'ed.
- OSM-Cron nicht gescheduled oder deployed.
- Kein `git push`.
