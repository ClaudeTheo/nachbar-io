-- 037_fix_notification_types_and_cron.sql
-- Erweitert notifications_type_check um alle im Code verwendeten Typen.
-- 12 fehlende Typen hinzufuegen, die von verschiedenen Modulen genutzt werden.

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  -- Bestehende Typen
  'alert', 'alert_response', 'help_match', 'marketplace',
  'lost_found', 'news', 'checkin_reminder', 'system',
  'care_sos', 'care_sos_response', 'care_checkin_reminder',
  'care_checkin_missed', 'care_medication_reminder',
  'care_medication_missed', 'care_appointment_reminder',
  'care_escalation', 'care_helper_verified',
  -- Neue Typen (im Code verwendet aber bisher fehlend)
  'broadcast',               -- Admin-Broadcast-Nachrichten
  'help_response',           -- Antwort auf Hilfe-Anfrage
  'event_participation',     -- Teilnahme an Veranstaltung
  'expert_review',           -- Bewertung als Experte
  'expert_endorsement',      -- Empfehlung als Experte
  'connection_accepted',     -- Nachbar-Verbindung akzeptiert
  'poll_vote',               -- Abstimmung bei Umfrage
  'tip_confirmation',        -- Tipp bestaetigt
  'message',                 -- Direktnachricht
  'leihboerse',              -- Leihboerse-Anfrage
  'verification_approved',   -- Adress-Verifizierung genehmigt
  'verification_rejected'    -- Adress-Verifizierung abgelehnt
));
