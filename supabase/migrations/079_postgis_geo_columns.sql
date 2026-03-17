-- Migration 079: PostGIS geo columns
-- Aktiviert PostGIS und fuegt geography-Spalten hinzu

-- 1. PostGIS Extension aktivieren
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. map_houses: geography(Point) Spalte
ALTER TABLE map_houses
  ADD COLUMN IF NOT EXISTS geo geography(Point, 4326);

-- 3. Bestehende lat/lng-Daten in geo-Spalte uebernehmen
UPDATE map_houses
  SET geo = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  WHERE lat IS NOT NULL AND lng IS NOT NULL AND geo IS NULL;

-- 4. GiST-Index fuer Radius-Queries (ST_DWithin)
CREATE INDEX IF NOT EXISTS idx_map_houses_geo_gist
  ON map_houses USING GIST(geo);

-- 5. quarters: boundary als Polygon
ALTER TABLE quarters
  ADD COLUMN IF NOT EXISTS boundary geography(Polygon, 4326);

-- 6. households: FK zu map_houses fuer direkte Standortzuordnung
ALTER TABLE households
  ADD COLUMN IF NOT EXISTS map_house_id TEXT REFERENCES map_houses(id);
