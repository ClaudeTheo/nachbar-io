-- Migration 058: PostGIS Hilfsfunktionen fuer Quartier-Geo-Zuweisung

-- 1) Quartier finden das einen Punkt enthaelt (aktive/activating/thriving)
CREATE OR REPLACE FUNCTION find_quarter_containing_point(p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION)
RETURNS TABLE(id UUID, name TEXT, status TEXT) AS $$
  SELECT q.id, q.name, q.status
  FROM quarters q
  WHERE q.geo_boundary IS NOT NULL
    AND q.status IN ('active', 'activating', 'thriving')
    AND ST_Contains(q.geo_boundary, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326))
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- 2) Naechstes Keim-Quartier im Umkreis finden
CREATE OR REPLACE FUNCTION find_nearest_seeding_quarter(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_m DOUBLE PRECISION DEFAULT 300
)
RETURNS TABLE(id UUID, name TEXT, status TEXT, distance_m DOUBLE PRECISION) AS $$
  SELECT
    q.id, q.name, q.status,
    ST_Distance(
      q.geo_center::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) AS distance_m
  FROM quarters q
  WHERE q.geo_center IS NOT NULL
    AND q.status = 'seeding'
    AND ST_DWithin(
      q.geo_center::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_m
    )
  ORDER BY distance_m
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- 3) Quartier-Boundary als Kreis setzen
CREATE OR REPLACE FUNCTION set_quarter_boundary_circle(p_quarter_id UUID, p_radius_m DOUBLE PRECISION DEFAULT 200)
RETURNS VOID AS $$
  UPDATE quarters
  SET geo_boundary = ST_Buffer(geo_center::geography, p_radius_m)::geometry
  WHERE id = p_quarter_id
    AND geo_center IS NOT NULL;
$$ LANGUAGE sql;
