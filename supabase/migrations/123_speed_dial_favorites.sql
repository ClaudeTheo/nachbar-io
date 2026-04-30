-- Migration 123: Speed-Dial Favoriten fuer Kiosk
-- Referenz-Tabelle: Zeiger auf bestehende Kontakte (keine Daten-Duplikation)

CREATE TABLE IF NOT EXISTS speed_dial_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN (
    'caregiver_link',
    'emergency_contact',
    'memory_contact'
  )),
  source_id TEXT NOT NULL,
  sort_order INT NOT NULL CHECK (sort_order BETWEEN 1 AND 5),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, sort_order),
  UNIQUE (user_id, source_type, source_id)
);

-- Index fuer schnelle Abfragen pro Bewohner
CREATE INDEX idx_speed_dial_user ON speed_dial_favorites(user_id);

-- RLS aktivieren
ALTER TABLE speed_dial_favorites ENABLE ROW LEVEL SECURITY;

-- Policy: Bewohner darf eigene Favoriten lesen
CREATE POLICY "speed_dial_select_own"
  ON speed_dial_favorites
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Bewohner darf eigene Favoriten anlegen
CREATE POLICY "speed_dial_insert_own"
  ON speed_dial_favorites
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND created_by = auth.uid());

-- Policy: Bewohner darf eigene Favoriten aendern
CREATE POLICY "speed_dial_update_own"
  ON speed_dial_favorites
  FOR UPDATE
  USING (user_id = auth.uid());

-- Policy: Bewohner darf eigene Favoriten loeschen
CREATE POLICY "speed_dial_delete_own"
  ON speed_dial_favorites
  FOR DELETE
  USING (user_id = auth.uid());

-- Policy: Caregiver darf Favoriten zugewiesener Bewohner lesen
CREATE POLICY "speed_dial_select_caregiver"
  ON speed_dial_favorites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM caregiver_links
      WHERE caregiver_links.resident_id = speed_dial_favorites.user_id
        AND caregiver_links.caregiver_id = auth.uid()
        AND caregiver_links.revoked_at IS NULL
    )
  );

-- Policy: Caregiver darf Favoriten zugewiesener Bewohner anlegen
CREATE POLICY "speed_dial_insert_caregiver"
  ON speed_dial_favorites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM caregiver_links
      WHERE caregiver_links.resident_id = speed_dial_favorites.user_id
        AND caregiver_links.caregiver_id = auth.uid()
        AND caregiver_links.revoked_at IS NULL
    )
    AND created_by = auth.uid()
  );

-- Policy: Caregiver darf Favoriten zugewiesener Bewohner aendern
CREATE POLICY "speed_dial_update_caregiver"
  ON speed_dial_favorites
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM caregiver_links
      WHERE caregiver_links.resident_id = speed_dial_favorites.user_id
        AND caregiver_links.caregiver_id = auth.uid()
        AND caregiver_links.revoked_at IS NULL
    )
  );

-- Policy: Caregiver darf Favoriten zugewiesener Bewohner loeschen
CREATE POLICY "speed_dial_delete_caregiver"
  ON speed_dial_favorites
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM caregiver_links
      WHERE caregiver_links.resident_id = speed_dial_favorites.user_id
        AND caregiver_links.caregiver_id = auth.uid()
        AND caregiver_links.revoked_at IS NULL
    )
  );

-- Trigger: updated_at automatisch aktualisieren
CREATE OR REPLACE FUNCTION update_speed_dial_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_speed_dial_updated_at
  BEFORE UPDATE ON speed_dial_favorites
  FOR EACH ROW
  EXECUTE FUNCTION update_speed_dial_updated_at();
