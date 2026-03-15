-- 072_escalation_events.sql
-- Nachbar.io — Eskalations-Events: Verhindert doppelte Alerts, trackt Eskalationsverlauf

CREATE TABLE escalation_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage           text NOT NULL CHECK (stage IN ('reminder_4h', 'alert_8h', 'lotse_12h', 'urgent_24h')),
  triggered_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  notified_users  uuid[] NOT NULL DEFAULT '{}'
);

-- Index fuer offene Events pro Bewohner
CREATE INDEX idx_escalation_open ON escalation_events (resident_id) WHERE resolved_at IS NULL;

ALTER TABLE escalation_events ENABLE ROW LEVEL SECURITY;

-- Nur Service Role darf lesen/schreiben (Cron-Job)
-- Kein direkter Client-Zugriff noetig
CREATE POLICY "escalation_events_service_only" ON escalation_events
  FOR ALL USING (false);
