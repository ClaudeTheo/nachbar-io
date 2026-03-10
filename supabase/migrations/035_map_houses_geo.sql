-- ============================================================
-- Nachbar.io — Migration 035: Geo-Koordinaten fuer Haeuser
-- Fuegt lat/lng und quarter_id hinzu fuer Leaflet-Migration
-- ============================================================

-- Geo-Spalten
ALTER TABLE map_houses
    ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES quarters(id);

CREATE INDEX IF NOT EXISTS idx_map_houses_quarter ON map_houses(quarter_id);
CREATE INDEX IF NOT EXISTS idx_map_houses_geo ON map_houses(lat, lng);

-- Quarter-ID bei bestehenden Haushalten
ALTER TABLE households
    ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES quarters(id);

-- Pilotquartier-ID fuer bestehende Haeuser setzen
UPDATE map_houses SET quarter_id = (SELECT id FROM quarters WHERE slug = 'bad-saeckingen-pilot')
WHERE quarter_id IS NULL;

UPDATE households SET quarter_id = (SELECT id FROM quarters WHERE slug = 'bad-saeckingen-pilot')
WHERE quarter_id IS NULL;
