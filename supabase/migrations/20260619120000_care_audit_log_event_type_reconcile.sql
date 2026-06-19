-- Migration: care_audit_log.event_type CHECK an CareAuditEventType angleichen
-- Datum: 2026-06-19
--
-- Read-only Drift-Check vor Datei-Erstellung (Prod, 2026-06-19):
--   Constraint-Name: care_audit_log_event_type_check
--   CHECK enthielt nur die 21 Werte aus 028_care_audit_log.sql.
--   SELECT DISTINCT event_type ergab nur alte Werte:
--     checkin_not_well, checkin_ok, sos_accepted, sos_resolved, sos_triggered.
--   -> Keine Alt-Rows ausserhalb der TS-Union; normaler validierter CHECK ist moeglich.
--
-- Gegenueber 028 kommen 17 bereits im TS-Typ vorhandene Werte hinzu:
--   task_created, task_claimed, task_unclaimed, task_started, task_completed,
--   task_confirmed, task_cancelled, task_deleted,
--   caregiver_invited, caregiver_linked, caregiver_revoked,
--   heartbeat_toggle, auto_answer_consent_changed,
--   escalation_triggered, escalation_resolved,
--   consent_updated, consent_revoked.
-- Plus dieser Welle:
--   auto_answer_settings_changed.
--
-- Mini-Audit (2026-06-19):
-- - RLS/Trigger geprueft: care_audit_log (028 append-only; no_audit_update/no_audit_delete; 076 insert actor hardening)
-- - Findings: 0
-- - Audit-Trail: n/a (Whitelist-Erweiterung fuer bestehendes Audit-Log) | Rate-Limit: n/a
--
-- Rollback-Hinweis:
--   Ein Rueckbau auf die 028-Whitelist ist nur sicher, wenn keine Zeilen mit den
--   neu erlaubten event_type-Werten existieren. Andernfalls muessten diese
--   Alt-Rows vorher fachlich behandelt werden.

ALTER TABLE public.care_audit_log
  DROP CONSTRAINT IF EXISTS care_audit_log_event_type_check;

ALTER TABLE public.care_audit_log
  ADD CONSTRAINT care_audit_log_event_type_check
  CHECK (event_type IN (
    'sos_triggered',
    'sos_accepted',
    'sos_resolved',
    'sos_escalated',
    'sos_cancelled',
    'checkin_ok',
    'checkin_not_well',
    'checkin_missed',
    'checkin_escalated',
    'medication_taken',
    'medication_skipped',
    'medication_missed',
    'medication_snoozed',
    'appointment_confirmed',
    'appointment_missed',
    'visit_logged',
    'helper_registered',
    'helper_verified',
    'task_created',
    'task_claimed',
    'task_unclaimed',
    'task_started',
    'task_completed',
    'task_confirmed',
    'task_cancelled',
    'task_deleted',
    'document_generated',
    'profile_updated',
    'subscription_changed',
    'caregiver_invited',
    'caregiver_linked',
    'caregiver_revoked',
    'heartbeat_toggle',
    'auto_answer_consent_changed',
    'auto_answer_settings_changed',
    'escalation_triggered',
    'escalation_resolved',
    'consent_updated',
    'consent_revoked'
  ));

COMMENT ON CONSTRAINT care_audit_log_event_type_check ON public.care_audit_log IS
  '2026-06-19: Whitelist an CareAuditEventType angeglichen, inkl. auto_answer_settings_changed.';
