-- Rollback fuer Migration 203_circle_privacy_p0.sql
-- Achtung: Die privacy-first Datenkorrektur notify_neighbors=false ist bewusst
-- nicht rueckwaerts gesetzt. Fruehere Opt-outs lassen sich nicht sicher von
-- durch Migration 203 korrigierten Altwerten unterscheiden.

BEGIN;

DROP POLICY IF EXISTS "household_members_own_household_select"
  ON public.household_members;

DROP FUNCTION IF EXISTS public.is_my_verified_household(uuid);

DROP POLICY IF EXISTS "hm_read" ON public.household_members;
CREATE POLICY "hm_read" ON public.household_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_verified_member()
  );

DROP POLICY IF EXISTS "vacation_owner_select" ON public.vacation_modes;
DROP POLICY IF EXISTS "vacation_read" ON public.vacation_modes;
CREATE POLICY vacation_read ON public.vacation_modes
  FOR SELECT
  USING (is_verified_member());

ALTER TABLE public.vacation_modes
  ALTER COLUMN notify_neighbors SET DEFAULT true;

COMMIT;
