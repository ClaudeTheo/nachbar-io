-- ============================================================
-- Migration 20260529120000: Quartier-Isolation der Stammdaten
--
-- Schliesst Security H1 (households cross-quarter sichtbar) / M1 (users
-- cross-quarter) / L1 (map_houses cross-quarter) + DSGVO W5 (Quartier-
-- Isolation). Ergaenzt Migration 052, die die Content-Tabellen isoliert,
-- aber households/users/map_houses ausgelassen hatte.
--
-- NICHT Teil dieser Welle (Founder-Entscheidung 2026-05-29, bewusster Split):
-- der Spaltenschutz fuer households.invite_code per Spalten-REVOKE. Grund:
-- admin/page.tsx, useMapEditorState und household.service laden households
-- per Browser-Client mit select("*"); ein Spalten-REVOKE wuerde diese Lese-
-- pfade brechen. Der Schutz folgt als eigene Welle mit Admin-Lesepfad-Umbau
-- (Service-Role/RPC). Siehe docs/plans/2026-05-29-rls-quarter-isolation-fix-plan.md.
--
-- Nutzt bestehende Security-Definer-Helper aus Migration 051:
--   get_user_quarter_id(), is_super_admin(), is_quarter_admin_for(uuid)
-- Neue Security-Definer-Helper (Muster aus Migration 20260527191000) gegen
-- RLS-Rekursion auf household_members/households:
--   is_same_quarter_user(uuid), is_household_in_my_quarter(uuid)
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Security-Definer-Helper (umgehen RLS -> keine Rekursion)
-- ------------------------------------------------------------

-- Ist der Ziel-Nutzer im selben Quartier wie der Aufrufer?
CREATE OR REPLACE FUNCTION public.is_same_quarter_user(p_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_members hm
    JOIN public.households h ON h.id = hm.household_id
    WHERE hm.user_id = p_target_user_id
      AND h.quarter_id = public.get_user_quarter_id()
  );
$$;

-- Gehoert der Haushalt zum Quartier des Aufrufers?
CREATE OR REPLACE FUNCTION public.is_household_in_my_quarter(p_household_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.households h
    WHERE h.id = p_household_id
      AND h.quarter_id = public.get_user_quarter_id()
  );
$$;

REVOKE ALL ON FUNCTION public.is_same_quarter_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_household_in_my_quarter(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_same_quarter_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_household_in_my_quarter(uuid) TO authenticated;

-- ------------------------------------------------------------
-- 2. households — direkt ueber quarter_id isolieren
--    Ersetzt die breite "households_read_authenticated" (Mig 040,
--    auth.uid() IS NOT NULL) und die alte "households_read" (Mig 001,
--    is_verified_member()), die Haushalte quartiersuebergreifend zeigten.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "households_read_authenticated" ON public.households;
DROP POLICY IF EXISTS "households_read" ON public.households;

CREATE POLICY households_quarter_select ON public.households
  FOR SELECT USING (
    quarter_id = public.get_user_quarter_id()
    OR public.is_super_admin()
    OR public.is_quarter_admin_for(quarter_id)
  );

-- ------------------------------------------------------------
-- 3. users — ueber das Quartier des Haushalts isolieren
--    Ersetzt "users_read_verified" (Mig 001, is_verified_member()), die
--    allen verifizierten Nutzern alle Profile quartiersuebergreifend zeigte.
--    "users_read_own" (eigene Zeile, id = auth.uid()) bleibt unangetastet.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "users_read_verified" ON public.users;

CREATE POLICY users_quarter_select ON public.users
  FOR SELECT USING (
    id = auth.uid()
    OR public.is_super_admin()
    OR public.is_same_quarter_user(id)
  );

-- ------------------------------------------------------------
-- 4. map_houses — ueber den verknuepften Haushalt isolieren
--    Ersetzt "map_houses_read" (Mig 007, is_verified_member()), die allen
--    verifizierten Nutzern alle Karten-Haeuser zeigte.
--    household_id IS NULL = freie Karten-Pins ohne Haushalt (keine PII, nur
--    SVG-Position + Hausnummer-String) bleiben sichtbar, bis map_houses ein
--    eigenes quarter_id bekommt (Future-Work).
--    "map_houses_user_upsert" (eigener Haushalt, FOR ALL) bleibt unangetastet.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "map_houses_read" ON public.map_houses;

CREATE POLICY map_houses_quarter_select ON public.map_houses
  FOR SELECT USING (
    public.is_super_admin()
    OR household_id IS NULL
    OR public.is_household_in_my_quarter(household_id)
  );

COMMIT;
