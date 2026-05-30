-- ============================================================
-- Migration 20260530160000: Spaltenschutz households.invite_code
--
-- Folge-Welle zu Migration 20260529120000 (Quartier-Isolation, PR #28).
-- Dort wurde die Row-Isolation gesetzt, der Spaltenschutz fuer invite_code
-- aber bewusst ausgeklammert (Founder-Split), weil admin/page.tsx,
-- useMapEditorState und household.service per Browser-Client select("*")
-- laden. Diese Welle holt den Spaltenschutz nach; der Admin-Lesepfad fuer
-- invite_code laeuft ab jetzt server-seitig ueber Service-Role
-- (app/api/admin/households).
--
-- Schliesst Security H1-Rest (Pre-Pilot-Audit): nach der Row-Isolation
-- sieht ein Mitglied nur Haushalte im eigenen Quartier, konnte aber deren
-- invite_code lesen und sich so als noch-nicht-beigetretener Nachbar
-- ausgeben.
--
-- Prod-Grant-Status vor Apply (read-only geprueft 2026-05-30):
--   anon + authenticated haben je table-level SELECT UND separaten
--   column-level SELECT(invite_code) (Supabase-Default). Beide Wege muessen
--   entfernt werden, sonst greift einer weiter.
--
-- WICHTIG (durable): column-level SELECT-Grants sind explizit. Kuenftige
-- households-Spalten brauchen einen eigenen GRANT SELECT (<spalte>) TO
-- authenticated, anon — sonst sind sie fuer Browser-Clients unsichtbar.
-- ============================================================

BEGIN;

-- 1. Beide bestehenden SELECT-Wege (table-weit + column-explizit) entfernen.
REVOKE SELECT ON public.households FROM anon, authenticated;
REVOKE SELECT (invite_code) ON public.households FROM anon, authenticated;

-- 2. SELECT auf alle Spalten AUSSER invite_code zurueckgeben (Prod-Stand
--    2026-05-30: 21 Spalten, hier die 20 erlaubten in Tabellen-Reihenfolge).
GRANT SELECT (
  id,
  street_name,
  house_number,
  lat,
  lng,
  verified,
  created_at,
  quarter_id,
  map_house_id,
  quiet_hours_enabled,
  quiet_hours_start,
  quiet_hours_end,
  postal_code,
  city,
  position_source,
  position_accuracy,
  position_verified,
  position_verified_at,
  position_manual_override,
  position_raw_payload
) ON public.households TO authenticated, anon;

-- service_role bleibt unangetastet (liest invite_code weiter fuer die
-- Admin-Route app/api/admin/households + bestehende Server-Pfade).

COMMIT;
