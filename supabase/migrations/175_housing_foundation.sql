-- Migration 175: Hausverwaltungs-Fundament
-- Task: A1 aus docs/plans/2026-04-21-hausverwaltung-modul-implementation.md
-- Kontext: Free-first Bewohner-App mit optionalem HV-Layer (civic-Adaption).
-- Enthaelt:
--   - Schatten-Quartier "Offenes Quartier Deutschland" fuer Bewohner
--     ohne echte Quartier-Wahl (UUID 0000...0001).
--   - Doku-Kommentare auf quarters, civic_organizations.type und
--     organizations.org_type (kein Schema-Aenderung).
-- Rueckbau: 175_housing_foundation.down.sql
-- Idempotent: ja (ON CONFLICT DO NOTHING, keine Schema-Writes).

begin;

-- Schatten-Quartier fuer Free-first-Onboarding.
-- Geographisches Dummy: Mittelpunkt Deutschland, Bounds ueber ganz DE,
-- damit keine Validation sprengt. Die UI maskiert das Quartier als
-- "Ohne Quartier" (siehe lib/quarter-shadow.ts in Task A3).
insert into public.quarters (
  id, name, slug,
  center_lat, center_lng, zoom_level,
  bounds_sw_lat, bounds_sw_lng,
  bounds_ne_lat, bounds_ne_lng,
  created_at, updated_at
)
values (
  '00000000-0000-0000-0000-000000000001',
  'Offenes Quartier Deutschland',
  'offenes-quartier-de',
  51.1657, 10.4515, 6,    -- Mittelpunkt DE, Zoom 6 (Laenderebene)
  47.2701, 5.8663,        -- SW-Ecke: Konstanz-Gegend
  55.0581, 15.0418,       -- NE-Ecke: Usedom
  now(), now()
)
on conflict (id) do nothing;

-- Doku-Kommentare (helfen Devs + spaeteren Sessions)
comment on table public.quarters is
  'Quartiere als RLS-Scope-Einheit. Enthaelt echte Pilot-Quartiere und das Schatten-Quartier "Offenes Quartier Deutschland" (UUID 00000000-0000-0000-0000-000000000001) fuer Free-first-Bewohner ohne HV-/Quartier-Wahl. Ab Mig 175.';

comment on column public.civic_organizations.type is
  'Erlaubte Werte (freies text-Feld, kein Check): kommune, pflege, housing, sonstiges. "housing" = Hausverwaltung fuer HV-Modul ab Mig 175.';

comment on column public.organizations.org_type is
  'DEPRECATED-Wert "housing" ab Mig 175: Hausverwaltungen leben in civic_organizations.type="housing". Alter Enum-Wert bleibt fuer Historie, darf nicht neu gesetzt werden.';

commit;
