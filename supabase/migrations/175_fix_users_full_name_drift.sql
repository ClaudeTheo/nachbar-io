-- 175_fix_users_full_name_drift.sql
-- Drift-Repair: Prod fehlt public.users.full_name trotz Mig 067-Codepfad.
-- Keine neuen personenbezogenen Daten: full_name wird nur aus display_name gespiegelt.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Prod enthaelt alte Testdaten mit role='user', waehrend users_role_check
-- inzwischen nur die neuen Rollen erlaubt. Die Constraint ist NOT VALID,
-- blockiert aber trotzdem jedes UPDATE auf diese Altzeilen.
-- Daher fuer diesen Backfill kurz entfernen und unveraendert wieder anlegen.
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

UPDATE public.users
SET full_name = display_name
WHERE full_name IS NULL
  AND display_name IS NOT NULL;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role = ANY (ARRAY[
    'resident'::text,
    'caregiver'::text,
    'org_admin'::text,
    'org_viewer'::text,
    'doctor'::text,
    'senior'::text,
    'admin'::text
  ])) NOT VALID;
