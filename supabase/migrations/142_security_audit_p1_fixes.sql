-- Migration 142: Security Audit P1 Fixes
-- Gefunden durch Red-Team Analyse + 3 Codex Review-Iterationen
-- Architektur-Entscheidung: Invite-Logik NUR im Service, NICHT in RLS

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

-- P1-4: caregiver_links — kein User-INSERT, nur service_role
-- Invite-Validierung + Link-Erstellung laeuft ueber redeemInviteCode() mit Admin-Client
-- RLS hat bewusst KEINE INSERT Policy → erzwingt kontrollierten Service-Layer
DROP POLICY IF EXISTS caregiver_links_insert ON caregiver_links;
DROP POLICY IF EXISTS caregiver_links_insert_resident ON caregiver_links;
DROP POLICY IF EXISTS caregiver_links_insert_safe ON caregiver_links;

-- P1-B: Residents duerfen plus_trial_end nicht direkt manipulieren
-- Trigger setzt Wert still zurueck wenn nicht-service_role aendert
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
