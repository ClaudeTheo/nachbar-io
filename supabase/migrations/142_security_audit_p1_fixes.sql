-- Migration 142: Security Audit P1 Fixes
-- Gefunden durch Red-Team Analyse + Codex Adversarial Review

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
-- RLS war enabled, aber kein INSERT → Einladungs-Einloesung schlug still fehl
-- Codex Review: Alte Policy war zu offen (Bypass ohne Invite moeglich)
-- Neue Policy: Bewohner kann Link erstellen ODER Caregiver nur mit validem Invite
DROP POLICY IF EXISTS caregiver_links_insert ON caregiver_links;
DROP POLICY IF EXISTS caregiver_links_insert_resident ON caregiver_links;
CREATE POLICY caregiver_links_insert_safe ON caregiver_links FOR INSERT
  WITH CHECK (
    -- Bewohner erstellt Link (Einladung)
    auth.uid() = resident_id
    OR
    -- Caregiver loest Einladung ein: muss validen, eingeloesten Invite haben
    (auth.uid() = caregiver_id AND EXISTS (
      SELECT 1 FROM caregiver_invites ci
      WHERE ci.resident_id = caregiver_links.resident_id
        AND ci.used_by = auth.uid()
        AND ci.used_at IS NOT NULL
    ))
  );
