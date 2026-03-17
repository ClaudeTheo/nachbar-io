-- Migration 080: Geo-Konsistenz-Trigger
-- Stellt sicher: quarter_id ist konsistent, geo liegt in boundary

-- 1. Trigger: Bei INSERT/UPDATE auf households → quarter_id aus map_houses ableiten
CREATE OR REPLACE FUNCTION sync_household_quarter_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.map_house_id IS NOT NULL THEN
    SELECT quarter_id INTO NEW.quarter_id
    FROM map_houses
    WHERE id = NEW.map_house_id;

    IF NEW.quarter_id IS NULL THEN
      RAISE EXCEPTION 'map_house_id % hat kein gueltiges quarter_id', NEW.map_house_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_household_quarter_id
  BEFORE INSERT OR UPDATE OF map_house_id ON households
  FOR EACH ROW
  EXECUTE FUNCTION sync_household_quarter_id();

-- 2. Trigger: Bei INSERT/UPDATE auf map_houses → geo muss in quarter boundary liegen
CREATE OR REPLACE FUNCTION validate_house_in_quarter_boundary()
RETURNS TRIGGER AS $$
DECLARE
  quarter_boundary geography;
BEGIN
  -- Nur pruefen wenn geo UND quarter_id gesetzt
  IF NEW.geo IS NOT NULL AND NEW.quarter_id IS NOT NULL THEN
    SELECT boundary INTO quarter_boundary
    FROM quarters
    WHERE id = NEW.quarter_id;

    -- Nur validieren wenn Quartier eine Boundary hat
    IF quarter_boundary IS NOT NULL THEN
      IF NOT ST_Within(NEW.geo::geometry, quarter_boundary::geometry) THEN
        RAISE EXCEPTION 'Haus % liegt nicht innerhalb der Quartier-Boundary', NEW.id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_house_in_boundary
  BEFORE INSERT OR UPDATE OF geo, quarter_id ON map_houses
  FOR EACH ROW
  EXECUTE FUNCTION validate_house_in_quarter_boundary();

-- 3. Trigger: geo automatisch aus lat/lng berechnen bei INSERT/UPDATE
CREATE OR REPLACE FUNCTION sync_map_house_geo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    NEW.geo := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_map_house_geo
  BEFORE INSERT OR UPDATE OF lat, lng ON map_houses
  FOR EACH ROW
  EXECUTE FUNCTION sync_map_house_geo();
