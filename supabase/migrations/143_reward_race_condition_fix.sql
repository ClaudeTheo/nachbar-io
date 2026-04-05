-- Migration 143: Kursbelohnung Race-Condition Fix
-- Verhindert doppelte Grants bei parallelen Requests
-- Entfernt User-INSERT/UPDATE Policies (nur service_role darf schreiben)

-- 1. UNIQUE Constraint: Maximal 1 Grant pro (enrollment, caregiver) Kombination
-- Verhindert DB-seitig doppelte Claims bei TOCTOU Race Conditions
ALTER TABLE plus_trial_grants
  ADD CONSTRAINT uq_trial_grant_enrollment_caregiver
  UNIQUE (enrollment_id, caregiver_user_id);

-- 2. User-INSERT/UPDATE Policies entfernen
-- Grants duerfen NUR ueber service_role (Admin-Client) erstellt werden
-- Verhindert direkten Supabase-Client-Zugriff zum Erstellen/Upgraden von Grants
DROP POLICY IF EXISTS trial_grants_insert ON plus_trial_grants;
DROP POLICY IF EXISTS trial_grants_update ON plus_trial_grants;
-- SELECT-Policies bleiben bestehen (trial_grants_own + trial_grants_instructor)
