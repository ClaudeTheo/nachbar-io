-- Migration 142: Security Audit P1 Fixes
-- Gefunden durch Red-Team Analyse + 3 Codex Review-Iterationen

-- P1-2: help_requests Cross-Quarter Datenleck fixen
-- Vorher: USING=(status = 'open') → jeder sah ALLE offenen Requests
DROP POLICY IF EXISTS requests_open_read ON help_requests;
CREATE POLICY requests_open_read ON help_requests FOR SELECT
  USING (status = 'open' AND quarter_id = get_user_quarter_id());

-- P1-3: prevention_enrollments DELETE blockieren
-- Vorher: ALL Policy → User konnte eigene Enrollments loeschen (Nachweis-Verlust)
DROP POLICY IF EXISTS prevention_enrollments_own ON prevention_enrollments;
CREATE POLICY prevention_enrollments_select_own ON prevention_enrollments FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY prevention_enrollments_insert_own ON prevention_enrollments FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY prevention_enrollments_update_own ON prevention_enrollments FOR UPDATE
  USING (user_id = auth.uid());
-- Kein DELETE fuer User — nur service_role/admin

-- P1-4: caregiver_links INSERT Policy (fehlte komplett)
-- Codex Iteration 1: Zu offene Policy (jeder konnte sich verknuepfen)
-- Codex Iteration 2: used_at Check → Order-of-Operations Bug (INSERT vor used_at)
-- Codex Iteration 3 (final): Pruefen ob unexpired Invite existiert
DROP POLICY IF EXISTS caregiver_links_insert ON caregiver_links;
DROP POLICY IF EXISTS caregiver_links_insert_resident ON caregiver_links;
DROP POLICY IF EXISTS caregiver_links_insert_safe ON caregiver_links;
CREATE POLICY caregiver_links_insert_safe ON caregiver_links FOR INSERT
  WITH CHECK (
    -- Bewohner erstellt eigenen Link
    auth.uid() = resident_id
    OR
    -- Caregiver: Es muss ein gueltiger (nicht abgelaufener) Invite fuer diese resident_id existieren
    (auth.uid() = caregiver_id AND EXISTS (
      SELECT 1 FROM caregiver_invites ci
      WHERE ci.resident_id = caregiver_links.resident_id
        AND ci.expires_at > now()
        AND ci.used_at IS NULL
    ))
  );

-- P1-B (Codex Adversarial): Residents duerfen plus_trial_end nicht manipulieren
-- Trigger blockiert Aenderungen an plus_trial_end fuer nicht-service_role
CREATE OR REPLACE FUNCTION protect_plus_trial_end()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.plus_trial_end IS DISTINCT FROM NEW.plus_trial_end)
     AND current_setting('request.jwt.claim.role', true) != 'service_role'
  THEN
    NEW.plus_trial_end := OLD.plus_trial_end;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_plus_trial_end_trigger ON caregiver_links;
CREATE TRIGGER protect_plus_trial_end_trigger
  BEFORE UPDATE ON caregiver_links
  FOR EACH ROW
  EXECUTE FUNCTION protect_plus_trial_end();
