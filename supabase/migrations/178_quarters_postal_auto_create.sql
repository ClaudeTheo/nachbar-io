-- Migration 178: PLZ-Auto-Quartiere (A3-Pivot Free-First mit Pflicht-Adresse)
-- Task: A3 (PLZ-Auto-Quartier-Bildung) aus
--       docs/plans/2026-04-21-hausverwaltung-modul-implementation.md
-- Kontext: Free-User mit voller Adresse, der ausserhalb bestehender Pilot-
--          Quartiere registriert, soll automatisch ein PLZ-Quartier gruenden
--          oder einem bestehenden PLZ-Quartier beitreten. Der erste User in
--          einer PLZ wird quarter_admin (separate Insertion in quarter_admins
--          erfolgt durch den Registration-Service).
-- Vorbild: 051_multi_quarter_foundation (created_by-Mechanismus),
--          102_waste_source_driven (postal_code-Spalte existiert seit dort).
-- Rueckbau: 178_quarters_postal_auto_create.down.sql
-- Idempotent: ja (IF NOT EXISTS, partieller UNIQUE-Index, kein DROP).

begin;

-- Markiert Quartiere, die durch automatische Bildung (PLZ-Match oder Geo-
-- Cluster) entstanden sind, im Gegensatz zu Pilot-Quartieren mit
-- redaktionellem Setup. Auto-Quartiere bekommen reduzierten Funktionsumfang
-- (kein Map-Layer, kein Lotsenrat) bis sie manuell aktiviert werden.
alter table public.quarters
  add column if not exists auto_created boolean not null default false;

-- Skala der Quartier-Bildung. Phase 1 nutzt 'postal' (eine PLZ = ein Quartier).
-- Phase 2 fuegt 'geo' hinzu (PostGIS-Cluster fuer Anlagen, Hochhaeuser,
-- Strassenzuege). 'named' bleibt fuer redaktionell gepflegte Pilot-Quartiere.
alter table public.quarters
  add column if not exists scope text not null default 'named'
  check (scope in ('postal', 'geo', 'named'));

-- Race-safe Eindeutigkeit: pro PLZ darf es maximal EIN auto-created
-- Quartier geben. Verhindert Duplikate, wenn zwei User gleichzeitig in
-- derselben PLZ registrieren. Pilot-Quartiere (auto_created=false) sind
-- vom Index ausgenommen — sie duerfen denselben PLZ-Bereich teilen.
create unique index if not exists idx_quarters_postal_auto_unique
  on public.quarters(postal_code)
  where auto_created = true and postal_code is not null;

-- Doku-Kommentare
comment on column public.quarters.auto_created is
  'true = automatisch gebildet (Mig 178, A3-Pivot, PLZ-Auto-Quartier oder spaeter Geo-Cluster). false = redaktionell gepflegtes Pilot-Quartier.';

comment on column public.quarters.scope is
  'Skala der Quartier-Einheit: "postal" (PLZ-Quartier, Phase 1), "geo" (PostGIS-Cluster fuer Anlage/Hochhaus, Phase 2), "named" (Pilot-Quartier mit redaktionellem Namen).';

commit;
