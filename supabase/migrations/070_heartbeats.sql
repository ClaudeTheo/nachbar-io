-- 070_heartbeats.sql
-- Nachbar.io — User-Heartbeats: Passives Check-in bei App-Oeffnung oder Kiosk-Interaktion

CREATE TABLE heartbeats (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source      text NOT NULL CHECK (source IN ('app', 'kiosk', 'web')),
  device_type text CHECK (device_type IN ('mobile', 'tablet', 'kiosk', 'desktop')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index fuer schnelle "letzter Heartbeat"-Abfragen
CREATE INDEX idx_heartbeats_user_latest ON heartbeats (user_id, created_at DESC);

-- RLS aktivieren
ALTER TABLE heartbeats ENABLE ROW LEVEL SECURITY;

-- Policy: Nutzer sieht nur eigene Heartbeats
CREATE POLICY "heartbeats_select_own" ON heartbeats
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Nutzer kann eigene Heartbeats erstellen
CREATE POLICY "heartbeats_insert_own" ON heartbeats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Caregivers sehen Heartbeats verknuepfter Bewohner (heartbeat_visible=true)
-- HINWEIS: Abhaengig von caregiver_links Tabelle → wird in Migration 071 ergaenzt
