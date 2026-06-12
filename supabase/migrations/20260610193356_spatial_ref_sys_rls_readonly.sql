-- ============================================================
-- Migration 20260610193356: PostGIS spatial_ref_sys read-only absichern
--
-- Anlass: Supabase Security Advisor meldete am 2026-06-09 fuer Prod
-- `rls_disabled_in_public` auf public.spatial_ref_sys. Read-only-Pruefung
-- am 2026-06-10 zeigte: anon + authenticated hatten SELECT/INSERT/UPDATE/
-- DELETE auf der PostGIS-Referenztabelle. Das sind keine Nutzer- oder
-- Kundendaten, aber oeffentliche Schreib-/Loeschrechte auf SRID-Referenzen
-- sind ein Integritaetsrisiko.
--
-- Hosted-Supabase-Fix: Supabase Support hat im Ticket SU-393741 am 2026-06-11
-- die PostGIS-Extension serverseitig von public nach extensions verschoben.
-- Prod enthaelt deshalb keine public.spatial_ref_sys mehr; die angewendete
-- Migration-History-Version ist 20260610193356.
--
-- Ziel fuer Alt-/Local-Setups: Falls public.spatial_ref_sys noch existiert
-- (z. B. lokale Supabase-Stacks oder Hosted-Projekte vor Support-Fix), bleiben
-- SRID-Referenzdaten oeffentlich lesbar, damit PostGIS- und Client-Lookups nicht
-- brechen. Schreibende Zugriffe werden fuer Browser-Rollen explizit entzogen und
-- zusaetzlich durch RLS ohne DML-Policy blockiert.
--
-- Wichtiger Guard: Der komplette Legacy-Hardening-Teil laeuft nur, wenn
-- public.spatial_ref_sys noch existiert. Frische db-push-Laeufe gegen die
-- umgezogene Prod duerfen nicht an undefined_table scheitern. Diese Migration
-- versucht bewusst nicht, PostGIS selbst nach extensions zu verschieben; das
-- braucht Supabase-/Superuser-Rechte und ist in Prod bereits erledigt.
--
-- Supabase-Hosted-Hinweis: public.spatial_ref_sys kann der Rolle supabase_admin
-- gehoeren, weil PostGIS als Extension installiert wurde. In diesem Fall darf die
-- Migration als postgres REVOKE/GRANT anwenden, aber keine Owner-only RLS-DDL auf
-- der Tabelle ausfuehren. Der RLS-Teil ist deshalb best-effort gekapselt; der
-- garantierte Schutz fuer Local/Alt-Setups bleibt REVOKE ALL + GRANT SELECT.
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.spatial_ref_sys') IS NULL THEN
    RAISE NOTICE 'spatial_ref_sys: public table fehlt; PostGIS wurde durch Supabase Support SU-393741 nach extensions verschoben, Legacy-Hardening wird uebersprungen';
    RETURN;
  END IF;

  REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon, authenticated;
  GRANT SELECT ON TABLE public.spatial_ref_sys TO anon, authenticated;

  IF has_table_privilege('anon', 'public.spatial_ref_sys', 'INSERT')
    OR has_table_privilege('anon', 'public.spatial_ref_sys', 'UPDATE')
    OR has_table_privilege('anon', 'public.spatial_ref_sys', 'DELETE')
    OR has_table_privilege('authenticated', 'public.spatial_ref_sys', 'INSERT')
    OR has_table_privilege('authenticated', 'public.spatial_ref_sys', 'UPDATE')
    OR has_table_privilege('authenticated', 'public.spatial_ref_sys', 'DELETE')
  THEN
    RAISE NOTICE 'spatial_ref_sys: REVOKE konnte supabase_admin-GRANTs nicht entfernen; Owner-Level-Fix erforderlich';
  END IF;

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
  END;
END $$;

COMMIT;
