-- ============================================================
-- Migration 20260610100000: PostGIS spatial_ref_sys read-only absichern
--
-- Anlass: Supabase Security Advisor meldete am 2026-06-09 fuer Prod
-- `rls_disabled_in_public` auf public.spatial_ref_sys. Read-only-Pruefung
-- am 2026-06-10 zeigte: anon + authenticated hatten SELECT/INSERT/UPDATE/
-- DELETE auf der PostGIS-Referenztabelle. Das sind keine Nutzer- oder
-- Kundendaten, aber oeffentliche Schreib-/Loeschrechte auf SRID-Referenzen
-- sind ein Integritaetsrisiko.
--
-- Ziel: SRID-Referenzdaten bleiben oeffentlich lesbar, damit PostGIS- und
-- Client-Lookups nicht brechen. Schreibende Zugriffe werden fuer Browser-
-- Rollen explizit entzogen und zusaetzlich durch RLS ohne DML-Policy blockiert.
-- ============================================================

BEGIN;

ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon, authenticated;
GRANT SELECT ON TABLE public.spatial_ref_sys TO anon, authenticated;

DROP POLICY IF EXISTS spatial_ref_sys_read_reference_data
  ON public.spatial_ref_sys;

CREATE POLICY spatial_ref_sys_read_reference_data
  ON public.spatial_ref_sys
  FOR SELECT
  TO anon, authenticated
  USING (true);

COMMENT ON POLICY spatial_ref_sys_read_reference_data
  ON public.spatial_ref_sys
  IS 'PostGIS SRID-Referenzen sind oeffentlich lesbar; Browser-Rollen haben keine INSERT/UPDATE/DELETE-Policy.';

COMMIT;
