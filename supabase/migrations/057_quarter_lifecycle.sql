-- Migration 057: Quartier-Lifecycle mit PostGIS-Boundaries
-- Phase 3 des Strategie-Umsetzungsplans

-- 1) PostGIS Extension aktivieren
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2) Status-Werte erweitern (seeding/activating/active/thriving/dormant/archived)
-- Bestehende Werte: draft, active, paused, archived
ALTER TABLE quarters DROP CONSTRAINT IF EXISTS quarters_status_check;
ALTER TABLE quarters ADD CONSTRAINT quarters_status_check
  CHECK (status IN ('seeding', 'activating', 'active', 'thriving', 'dormant', 'archived'));

-- Bestehende Werte migrieren
UPDATE quarters SET status = 'seeding' WHERE status = 'draft';
UPDATE quarters SET status = 'dormant' WHERE status = 'paused';

-- 3) Neue Felder fuer Lifecycle
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS household_count INTEGER DEFAULT 0;
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS weekly_active_pct NUMERIC(5,2) DEFAULT 0;

-- 4) PostGIS Geo-Felder
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS geo_boundary GEOMETRY(POLYGON, 4326);
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS geo_center GEOMETRY(POINT, 4326);

-- 5) Bestehende center_lat/lng nach geo_center migrieren
UPDATE quarters
SET geo_center = ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)
WHERE center_lat IS NOT NULL
  AND center_lng IS NOT NULL
  AND geo_center IS NULL;

-- 6) Keim-Radius: 200m Kreis als initiale Boundary
UPDATE quarters
SET geo_boundary = ST_Buffer(geo_center::geography, 200)::geometry
WHERE geo_boundary IS NULL
  AND geo_center IS NOT NULL;

-- 7) Spatial Index fuer performante Geo-Queries
CREATE INDEX IF NOT EXISTS idx_quarters_geo_boundary
  ON quarters USING GIST (geo_boundary);

CREATE INDEX IF NOT EXISTS idx_quarters_geo_center
  ON quarters USING GIST (geo_center);

-- 8) Bereits aktive Quartiere: activated_at nachsetzen
UPDATE quarters
SET activated_at = created_at
WHERE status = 'active'
  AND activated_at IS NULL;

-- 9) Household-Count aktualisieren
UPDATE quarters q
SET household_count = (
  SELECT COUNT(DISTINCT h.id)
  FROM households h
  WHERE h.quarter_id = q.id
)
WHERE household_count = 0 OR household_count IS NULL;
