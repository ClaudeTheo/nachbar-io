-- Migration AA-1: Senior-Einwilligung fuer automatische Anruf-Annahme
-- Welle AA (2026-06-18). Auto-Annahme braucht BEIDE Seiten:
--   1. der Angehoerige erlaubt sie (Mig 084: auto_answer_allowed/_start/_end)
--   2. der Senior willigt ausdruecklich ein (NEU, diese Spalte)
-- NULL = keine Einwilligung -> niemals Auto-Annahme.
--
-- Mini-Audit Welle AA (2026-06-18): der Schreibpfad laeuft ausschliesslich ueber die
-- auditierte service_role-Route /api/senior/auto-answer-consent. Der Sticky-Trigger
-- unten macht die Spalte fuer jeden Nicht-service_role-UPDATE unveraenderlich, damit
-- ein direkter RLS-Update (resident, spaltenlose Policy 071:50) den Audit-Trail nicht
-- umgehen kann (Befund AA-AUDIT-2). Bewusst SCHMAL: die vorbestehende Consent-Grant-
-- Luecke (consent_status/sensitive_data_allowed, Befund CL-1) bleibt einem separaten
-- Haertungs-Task vorbehalten (task_796f821c) und wird hier NICHT angefasst.

BEGIN;

-- 1. Nullable Einwilligungs-Zeitstempel (idempotent).
ALTER TABLE caregiver_links
  ADD COLUMN IF NOT EXISTS auto_answer_senior_consented_at TIMESTAMPTZ;

COMMENT ON COLUMN caregiver_links.auto_answer_senior_consented_at IS
  'Welle AA: Zeitpunkt der ausdruecklichen Senior-Einwilligung in die automatische Anruf-Annahme dieses Links. NULL = keine Einwilligung (Default). Granularer Auto-Annahme-Opt-in, abzugrenzen von consent_status (allgemeiner Setup-Consent, Mig 197). Nur ueber die auditierte service_role-Route setzbar.';

-- 2. Sticky-Schutz: nur service_role (Admin-Route/Migration) darf die Spalte aendern.
--    Rollen-Erkennung nach juengstem Audit-Standard (Mig 198).
CREATE OR REPLACE FUNCTION protect_auto_answer_senior_consent()
RETURNS TRIGGER AS $$
DECLARE
  caller_role text;
BEGIN
  caller_role := current_setting('role', true);

  -- service_role (Admin-Routen, Migrationen, Cron) darf die Einwilligung setzen/entziehen.
  IF caller_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Alle anderen: Spalte bleibt unveraenderlich (auf Alt-Wert zuruecksetzen).
  NEW.auto_answer_senior_consented_at := OLD.auto_answer_senior_consented_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION protect_auto_answer_senior_consent IS
  'Welle AA-1: macht caregiver_links.auto_answer_senior_consented_at fuer Nicht-service_role-UPDATE sticky. Einwilligung nur ueber die auditierte service_role-Route /api/senior/auto-answer-consent.';

DROP TRIGGER IF EXISTS protect_auto_answer_senior_consent_trigger ON caregiver_links;
CREATE TRIGGER protect_auto_answer_senior_consent_trigger
  BEFORE UPDATE ON caregiver_links
  FOR EACH ROW
  EXECUTE FUNCTION protect_auto_answer_senior_consent();

COMMIT;
