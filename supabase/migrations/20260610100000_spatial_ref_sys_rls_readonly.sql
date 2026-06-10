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
--
-- Supabase-Hosted-Hinweis: public.spatial_ref_sys kann der Rolle supabase_admin
-- gehoeren, weil PostGIS als Extension installiert wurde. In diesem Fall darf die
-- Migration als postgres REVOKE/GRANT anwenden, aber keine Owner-only RLS-DDL auf
-- der Tabelle ausfuehren. Der RLS-Teil ist deshalb best-effort gekapselt; der
-- garantierte Schutz bleibt REVOKE ALL + GRANT SELECT.
--
-- Prod-Verifikation 2026-06-10 (Projekt uylszchlyhbpbmslcnka) zeigte zusaetzlich:
-- wenn die Direkt-GRANTs an anon/authenticated von supabase_admin stammen, kann
-- postgres sie ebenfalls nicht wirksam entziehen. Dann bleibt die Advisor-Warnung
-- `rls_disabled_in_public` fuer spatial_ref_sys als PostGIS-Extension-Sonderfall
-- bestehen; ein echter Fix braucht Owner-/Supabase-Admin-Rechte. Der App-Code
-- greift nicht schreibend auf spatial_ref_sys zu (Gegenprobe: 0 Treffer).
-- ============================================================

BEGIN;

REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon, authenticated;
GRANT SELECT ON TABLE public.spatial_ref_sys TO anon, authenticated;

DO $$
BEGIN
  IF has_table_privilege('anon', 'public.spatial_ref_sys', 'INSERT')
    OR has_table_privilege('anon', 'public.spatial_ref_sys', 'UPDATE')
    OR has_table_privilege('anon', 'public.spatial_ref_sys', 'DELETE')
    OR has_table_privilege('authenticated', 'public.spatial_ref_sys', 'INSERT')
    OR has_table_privilege('authenticated', 'public.spatial_ref_sys', 'UPDATE')
    OR has_table_privilege('authenticated', 'public.spatial_ref_sys', 'DELETE')
  THEN
    RAISE NOTICE 'spatial_ref_sys: REVOKE konnte supabase_admin-GRANTs nicht entfernen; Owner-Level-Fix erforderlich';
  END IF;
END $$;

DO $$
BEGIN
  ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

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
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'spatial_ref_sys: keine Owner-Rechte fuer RLS - REVOKE/GRANT bleibt der wirksame Schutz';
END $$;

COMMIT;
