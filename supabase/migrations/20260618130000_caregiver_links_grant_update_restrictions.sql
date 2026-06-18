-- 20260618130000_caregiver_links_grant_update_restrictions.sql
-- Haertung CL-1 (HIGH) / AA-RLS-1 (CRITICAL-Vektor): Consent-Grant-Spalten auf caregiver_links sticky.
--
-- Hintergrund (Mini-Audit Welle AA, 2026-06-18, Befund CL-1 / task_796f821c):
--   Die einzige UPDATE-Policy "caregiver_links_update_resident" (Mig 071:50) ist SPALTENLOS
--   (USING/WITH CHECK nur auth.uid() = resident_id). Ein Resident kann damit JEDE Spalte seiner
--   Links setzen — inkl. der in Mig 197:119-123 eingefuehrten Grant-Spalten consent_status /
--   profile_edit_allowed / sensitive_data_allowed. sensitive_data_allowed gated direkt sensible
--   Care-Daten (modules/care/services/permissions.ts liest profile_edit_allowed) -> ein Resident
--   koennte sich per Self-Update zusaetzliche Angehoerigen-Rechte freischalten.
--
-- Fix: BEFORE-UPDATE-Trigger zwingt NEW dieser drei Spalten auf OLD zurueck, ausser bei
--   service_role. Muster wie protect_plus_trial_end (Mig 142) bzw. enforce_user_update_restrictions
--   (Mig 198). Rollen-Check nach juengstem Standard current_setting('role', true) = 'service_role'
--   (Befund CL-2 — nicht das aeltere request.jwt.claim.role aus Mig 142). Keine SECURITY-DEFINER-
--   Funktion noetig: der Trigger liest keine Tabellen und braucht keine erhoehten Rechte.
--
-- Sicherheits-Nachweis (Code autoritativ, Stand 2026-06-18):
--   * Die drei Grant-Spalten werden ausschliesslich per INSERT gesetzt
--     (lib/family-setup/senior-setup.service.ts:310-312, Admin-/service_role-Client).
--     Ein BEFORE-UPDATE-Trigger beruehrt INSERT nicht.
--   * KEIN Nicht-service_role-UPDATE-Pfad schreibt diese Spalten:
--     - updateCaregiverLink (links.service.ts) setzt nur revoked_at / heartbeat_visible.
--     - updateAutoAnswerSettings (caregiver-misc.service.ts) setzt nur auto_answer_*.
--   -> Sticky auf genau diese drei Spalten bricht keinen bestehenden Schreibpfad.
--
-- BEWUSST SCHMAL: auto_answer_allowed/_start/_end (Mig 084, Angehoerigen-RLS-Schreibpfad)
--   sowie revoked_at / heartbeat_visible (Resident-Self-Service, Mig 071) werden NICHT sticky.
--   Die vorbestehenden Trigger protect_plus_trial_end (Mig 142) und protect_auto_answer_senior_consent
--   (Mig AA-1) bleiben unangetastet — dieser Trigger ist disjunkt (eigene Spalten, eigener Name).
--
-- File-first. NICHT automatisch gegen Prod anwenden. Founder-Go: MIGRATION-PROD-GO-CL1.
-- Rollback:
--   DROP TRIGGER IF EXISTS enforce_caregiver_links_update_restrictions_trigger ON caregiver_links;
--   DROP FUNCTION IF EXISTS enforce_caregiver_links_update_restrictions();

BEGIN;

CREATE OR REPLACE FUNCTION enforce_caregiver_links_update_restrictions()
RETURNS TRIGGER AS $$
DECLARE
  caller_role text;
BEGIN
  caller_role := current_setting('role', true);

  -- service_role (Setup-/Admin-Routen, Migrationen, Cron) darf die Grant-Spalten setzen.
  IF caller_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Alle anderen (Resident via spaltenloser Policy 071): Consent-/Grant-Spalten sticky.
  NEW.consent_status := OLD.consent_status;
  NEW.profile_edit_allowed := OLD.profile_edit_allowed;
  NEW.sensitive_data_allowed := OLD.sensitive_data_allowed;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION enforce_caregiver_links_update_restrictions IS
  'Haertung CL-1: macht caregiver_links.consent_status/profile_edit_allowed/sensitive_data_allowed fuer Nicht-service_role-UPDATE sticky (spaltenlose Policy 071). Grant-Aenderung nur ueber service_role.';

DROP TRIGGER IF EXISTS enforce_caregiver_links_update_restrictions_trigger ON caregiver_links;
CREATE TRIGGER enforce_caregiver_links_update_restrictions_trigger
  BEFORE UPDATE ON caregiver_links
  FOR EACH ROW
  EXECUTE FUNCTION enforce_caregiver_links_update_restrictions();

COMMIT;
