-- Migration 049: Cron-Heartbeat-Tabelle (FMEA FM-SOS-03, FM-CI-01, FM-MED-01)
-- Ueberwacht ob Cron-Jobs regelmaessig ausgefuehrt werden

CREATE TABLE IF NOT EXISTS cron_heartbeats (
  job_id TEXT PRIMARY KEY,
  last_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: Nur Service-Role darf schreiben (Cron-Jobs), Admins duerfen lesen
ALTER TABLE cron_heartbeats ENABLE ROW LEVEL SECURITY;

-- Admins duerfen Heartbeats lesen (fuer Health-Dashboard)
CREATE POLICY "admins_can_read_heartbeats" ON cron_heartbeats
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

-- Service-Role darf alles (fuer Cron-Jobs)
-- (Service-Role umgeht RLS automatisch)

COMMENT ON TABLE cron_heartbeats IS 'Cron-Job-Heartbeats: Ueberwacht ob Cron-Jobs regelmaessig laufen (FMEA Massnahme)';
