-- Migration 090: Event-Nachberichte mit Fotos
-- Rueckblick nach Event-Ende: Text + Bilder

CREATE TABLE IF NOT EXISTS event_recaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT CHECK (char_length(text) <= 500),
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE event_recaps ENABLE ROW LEVEL SECURITY;

-- Lesen: Alle im selben Quartier
CREATE POLICY "event_recaps_read" ON event_recaps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN households h ON h.quarter_id = e.quarter_id
      JOIN household_members hm ON hm.household_id = h.id
      WHERE e.id = event_recaps.event_id
      AND hm.user_id = auth.uid()
    )
  );

-- Erstellen: Nur eigene Nachberichte
CREATE POLICY "event_recaps_insert" ON event_recaps
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Loeschen: Nur eigene
CREATE POLICY "event_recaps_delete" ON event_recaps
  FOR DELETE USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_event_recaps_event ON event_recaps(event_id);
