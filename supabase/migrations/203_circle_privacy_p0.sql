-- ============================================================
-- Nachbar.io - Migration 203: Circle privacy P0
-- - vacation_modes: owner-only reads, opt-in default false
-- - household_members: own row or own verified household only
-- ============================================================

BEGIN;

-- Bestehende und neue Nachbarschaftsfreigaben bleiben bis zur spaeteren
-- einwilligungsbasierten Kreisprojektion geschlossen.
ALTER TABLE public.vacation_modes
  ALTER COLUMN notify_neighbors SET DEFAULT false;

UPDATE public.vacation_modes
SET notify_neighbors = false
WHERE notify_neighbors IS DISTINCT FROM false;

DROP POLICY IF EXISTS "vacation_read" ON public.vacation_modes;
DROP POLICY IF EXISTS "vacation_owner_select" ON public.vacation_modes;

CREATE POLICY vacation_owner_select ON public.vacation_modes
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
  );

-- SECURITY DEFINER verhindert eine RLS-Rekursion auf household_members.
-- Der Helper beantwortet ausschliesslich, ob der aktuelle Nutzer selbst
-- verifiziertes Mitglied des angefragten Haushalts ist.
CREATE OR REPLACE FUNCTION public.is_my_verified_household(
  p_household_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_members hm
    WHERE hm.user_id = (SELECT auth.uid())
      AND hm.household_id = p_household_id
      AND hm.verified_at IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.is_my_verified_household(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_my_verified_household(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_my_verified_household(uuid) TO authenticated;

DROP POLICY IF EXISTS "hm_read" ON public.household_members;
DROP POLICY IF EXISTS "household_members_own_household_select" ON public.household_members;

CREATE POLICY household_members_own_household_select
  ON public.household_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_my_verified_household(household_id)
  );

COMMIT;
