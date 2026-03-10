-- ============================================================
-- Nachbar.io — Migration 016: Map-Houses Nutzer-Zuordnung
-- Fuegt household_id hinzu, damit Nutzer ihre eigene Position
-- auf der Karte setzen koennen (statt nur Admin)
-- ============================================================

-- 1. Spalte hinzufuegen
ALTER TABLE map_houses ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id);

-- 2. Backfill: Bestehende Eintraege mit Haushalt verknuepfen
UPDATE map_houses mh SET household_id = h.id
FROM households h
WHERE h.house_number = mh.house_number
AND h.street_name = CASE mh.street_code
  WHEN 'PS' THEN 'Purkersdorfer Straße'
  WHEN 'SN' THEN 'Sanarystraße'
  WHEN 'OR' THEN 'Oberer Rebberg'
END
AND mh.household_id IS NULL;

-- 3. RLS-Policy: Verifizierte Nutzer duerfen ihre eigene Haus-Position setzen
CREATE POLICY "map_houses_user_upsert" ON map_houses
  FOR ALL USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND verified_at IS NOT NULL
    )
  );
