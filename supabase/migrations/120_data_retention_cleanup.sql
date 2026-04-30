-- Migration 120: Automatische Datenbereinigung (DSGVO Art. 5(1)(e) Speicherbegrenzung)
--
-- DSGVO Art. 5(1)(e) — Speicherbegrenzung:
-- "Personenbezogene Daten muessen in einer Form gespeichert werden, die die
-- Identifizierung der betroffenen Personen nur so lange ermoeglicht, wie es
-- fuer die Zwecke, fuer die sie verarbeitet werden, erforderlich ist."
--
-- Aufbewahrungsfristen:
--   heartbeats        → 90 Tage  (passives Lebenszeichen, kurzfristig relevant)
--   care_checkins     → 180 Tage (aktive Statusmeldungen, laengere Pflege-Relevanz)
--   care_sos_alerts   → 365 Tage (Notfaelle, 1 Jahr fuer Dokumentationspflicht)
--
-- Aufruf: Vercel Cron-Job (taeglich) oder Supabase pg_cron
--   SELECT cleanup_expired_data();

-- Logging-Tabelle fuer Bereinigungsprotokolle
CREATE TABLE IF NOT EXISTS data_retention_log (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  executed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  heartbeats_deleted    INT NOT NULL DEFAULT 0,
  checkins_deleted      INT NOT NULL DEFAULT 0,
  sos_alerts_deleted    INT NOT NULL DEFAULT 0,
  execution_ms          INT,
  details               JSONB
);

-- Kommentar auf der Tabelle
COMMENT ON TABLE data_retention_log IS
  'Protokoll der automatischen DSGVO-Datenbereinigung (Art. 5(1)(e) Speicherbegrenzung)';

-- RLS aktivieren (nur service_role darf lesen/schreiben)
ALTER TABLE data_retention_log ENABLE ROW LEVEL SECURITY;

-- Keine Policy = nur service_role/postgres hat Zugriff (kein Client-Zugriff)


-- Hauptfunktion: Bereinigt abgelaufene personenbezogene Daten
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start         TIMESTAMPTZ;
  v_heartbeats    INT := 0;
  v_checkins      INT := 0;
  v_sos_alerts    INT := 0;
  v_execution_ms  INT;
  v_result        JSONB;
BEGIN
  v_start := clock_timestamp();

  -- 1. Heartbeats aelter als 90 Tage loeschen
  --    Passives Lebenszeichen — nach 90 Tagen nicht mehr benoetigt
  DELETE FROM heartbeats
  WHERE created_at < now() - INTERVAL '90 days';
  GET DIAGNOSTICS v_heartbeats = ROW_COUNT;

  -- 2. Care-Check-ins aelter als 180 Tage loeschen
  --    Aktive Statusmeldungen — laengere Aufbewahrung fuer Pflege-Kontext
  DELETE FROM care_checkins
  WHERE created_at < now() - INTERVAL '180 days';
  GET DIAGNOSTICS v_checkins = ROW_COUNT;

  -- 3. SOS-Alerts aelter als 365 Tage loeschen
  --    Notfall-Dokumentation — 1 Jahr Aufbewahrung
  DELETE FROM care_sos_alerts
  WHERE created_at < now() - INTERVAL '365 days';
  GET DIAGNOSTICS v_sos_alerts = ROW_COUNT;

  -- Ausfuehrungsdauer berechnen
  v_execution_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INT;

  -- Ergebnis-JSON zusammenbauen
  v_result := jsonb_build_object(
    'executed_at',         now(),
    'heartbeats_deleted',  v_heartbeats,
    'checkins_deleted',    v_checkins,
    'sos_alerts_deleted',  v_sos_alerts,
    'execution_ms',        v_execution_ms,
    'retention_policy', jsonb_build_object(
      'heartbeats_days',   90,
      'checkins_days',     180,
      'sos_alerts_days',   365
    )
  );

  -- Bereinigung protokollieren
  INSERT INTO data_retention_log (
    heartbeats_deleted,
    checkins_deleted,
    sos_alerts_deleted,
    execution_ms,
    details
  ) VALUES (
    v_heartbeats,
    v_checkins,
    v_sos_alerts,
    v_execution_ms,
    v_result
  );

  -- Zusammenfassung zurueckgeben
  RETURN v_result;
END;
$$;

-- Kommentar auf der Funktion
COMMENT ON FUNCTION cleanup_expired_data() IS
  'DSGVO Art. 5(1)(e): Loescht abgelaufene personenbezogene Daten (Heartbeats 90d, Check-ins 180d, SOS-Alerts 365d). Taeglich per Cron aufrufen.';

-- ============================================================
-- Combined from 120_doctor_geo_columns.sql to keep migration versions unique locally.
-- ============================================================

-- Migration 120: Geo-Koordinaten fuer Aerzte-Umkreissuche
-- Angewendet via Supabase MCP am 2026-04-08

ALTER TABLE public.doctor_profiles
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE INDEX IF NOT EXISTS idx_doctor_profiles_geo
  ON public.doctor_profiles (visible)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Migration 121: Status 'available' fuer freie Terminslots
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check
  CHECK (status = ANY (ARRAY['available', 'booked', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']));
