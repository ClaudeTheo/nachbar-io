-- Migration 107: Notfall-GPS — Standort-Spalten fuer Alerts
-- Design: docs/plans/2026-03-20-notfall-gps-design.md

-- 1. Neue Spalten auf alerts
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS location_lat DECIMAL(9,6);
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS location_lng DECIMAL(9,6);
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS location_source TEXT
  CHECK (location_source IN ('gps', 'household', 'none'));

-- 2. User-Einstellung fuer Standortfreigabe
ALTER TABLE users ADD COLUMN IF NOT EXISTS share_location_on_alert BOOLEAN DEFAULT true;

-- 3. Auto-Loeschung bei Resolved (DSGVO — GPS-Daten nicht laenger als noetig)
CREATE OR REPLACE FUNCTION clear_alert_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.location_lat := NULL;
    NEW.location_lng := NULL;
    NEW.location_source := 'none';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_clear_alert_location ON alerts;
CREATE TRIGGER trigger_clear_alert_location
  BEFORE UPDATE ON alerts
  FOR EACH ROW
  EXECUTE FUNCTION clear_alert_location();

-- 4. Index fuer Location-Abfragen (nur aktive Alerts mit GPS)
CREATE INDEX IF NOT EXISTS idx_alerts_location_active
  ON alerts (quarter_id, status)
  WHERE location_lat IS NOT NULL AND status IN ('open', 'help_coming');
