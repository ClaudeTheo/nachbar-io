-- 055_device_heartbeats.sql
-- Heartbeat-Monitoring fuer Kiosk-Geraete (MDR-Readiness)

CREATE TABLE IF NOT EXISTS device_heartbeats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_token_id UUID NOT NULL REFERENCES device_tokens(id) ON DELETE CASCADE,
  ram_percent SMALLINT NOT NULL CHECK (ram_percent BETWEEN 0 AND 100),
  cpu_temp_celsius REAL NOT NULL,
  restart_count SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_device_heartbeats_token_created
  ON device_heartbeats(device_token_id, created_at DESC);

ALTER TABLE device_heartbeats ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION cleanup_old_heartbeats()
RETURNS void AS $$
BEGIN
  DELETE FROM device_heartbeats
  WHERE created_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE device_heartbeats IS 'Heartbeat-Monitoring fuer Kiosk-Geraete (IEC 62304 Audit-Trail)';

-- RLS Policy: Nur Admins duerfen Heartbeats lesen
CREATE POLICY "device_heartbeats_select_admin" ON device_heartbeats
  FOR SELECT USING (is_admin());

-- Cleanup-Job: Alte Heartbeats taeglich um 03:00 entfernen
SELECT cron.schedule(
  'cleanup-device-heartbeats',
  '0 3 * * *',
  $$SELECT cleanup_old_heartbeats()$$
);
