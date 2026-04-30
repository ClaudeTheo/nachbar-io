-- Rollback fuer Migration 177: Phase-1-Schutzflags entfernen.

delete from public.feature_flags
where key in (
  'BILLING_ENABLED',
  'TWILIO_ENABLED',
  'CHECKIN_MESSAGES_ENABLED'
);
