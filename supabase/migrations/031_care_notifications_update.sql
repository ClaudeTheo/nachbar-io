-- 031_care_notifications_update.sql
-- Bestehende notifications Tabelle um Care-Typen erweitern
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'alert', 'alert_response', 'help_match', 'marketplace',
  'lost_found', 'news', 'checkin_reminder', 'system',
  'care_sos', 'care_sos_response', 'care_checkin_reminder',
  'care_checkin_missed', 'care_medication_reminder',
  'care_medication_missed', 'care_appointment_reminder',
  'care_escalation', 'care_helper_verified'
));
