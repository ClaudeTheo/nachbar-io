-- 175_fix_users_full_name_drift.down.sql
-- Rollback fuer Drift-Repair. Achtung: Codepfade aus Mig 067 erwarten diese Spalte.

ALTER TABLE public.users
  DROP COLUMN IF EXISTS full_name;
