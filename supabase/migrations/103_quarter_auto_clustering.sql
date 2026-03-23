-- Migration 103: Automatisches Quartier-Clustering
-- Algorithmus: Wachsender Cluster (100m Beitritt, 200m Max-Radius)

-- Finde naechstes Quartier-Mitglied im Radius
-- Gibt quarter_id und Distanz zurueck
CREATE OR REPLACE FUNCTION find_nearest_quarter_member(
  p_point GEOMETRY(POINT, 4326),
  p_radius_m INTEGER DEFAULT 100
)
RETURNS TABLE(quarter_id UUID, distance_m DOUBLE PRECISION)
LANGUAGE sql STABLE
AS $$
  SELECT
    h.quarter_id,
    ST_Distance(
      p_point::geography,
      ST_SetSRID(ST_MakePoint(h.lng, h.lat), 4326)::geography
    ) AS distance_m
  FROM households h
  INNER JOIN quarters q ON q.id = h.quarter_id
  WHERE q.status IN ('seeding', 'activating', 'active', 'thriving')
    AND ST_DWithin(
      p_point::geography,
      ST_SetSRID(ST_MakePoint(h.lng, h.lat), 4326)::geography,
      p_radius_m
    )
  ORDER BY distance_m ASC
  LIMIT 1;
$$;

-- Berechne hypothetischen neuen Centroid wenn ein Punkt hinzukommt
CREATE OR REPLACE FUNCTION calculate_new_centroid(
  p_quarter_id UUID,
  p_new_point GEOMETRY(POINT, 4326)
)
RETURNS GEOMETRY(POINT, 4326)
LANGUAGE sql STABLE
AS $$
  SELECT ST_SetSRID(
    ST_MakePoint(
      (SUM(h.lng) + ST_X(p_new_point)) / (COUNT(*) + 1),
      (SUM(h.lat) + ST_Y(p_new_point)) / (COUNT(*) + 1)
    ),
    4326
  )
  FROM households h
  WHERE h.quarter_id = p_quarter_id;
$$;

-- Pruefe ob alle Mitglieder innerhalb Max-Radius vom neuen Centroid sind
CREATE OR REPLACE FUNCTION check_max_radius(
  p_quarter_id UUID,
  p_new_centroid GEOMETRY(POINT, 4326),
  p_max_radius_m INTEGER DEFAULT 200
)
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM households h
    WHERE h.quarter_id = p_quarter_id
      AND ST_Distance(
        p_new_centroid::geography,
        ST_SetSRID(ST_MakePoint(h.lng, h.lat), 4326)::geography
      ) > p_max_radius_m
  );
$$;

-- Hauptfunktion: Weist einen Punkt einem Quartier zu
-- Gibt quarter_id zurueck (bestehendes oder neues Quartier)
CREATE OR REPLACE FUNCTION assign_point_to_quarter(
  p_point GEOMETRY(POINT, 4326),
  p_quarter_name TEXT DEFAULT 'Neues Quartier',
  p_city TEXT DEFAULT '',
  p_state TEXT DEFAULT '',
  p_country TEXT DEFAULT 'DE'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_quarter_id UUID;
  v_new_centroid GEOMETRY(POINT, 4326);
  v_radius_ok BOOLEAN;
  v_new_id UUID;
BEGIN
  -- Schritt 1: Naechstes aktives Quartier-Mitglied im 100m Radius?
  SELECT nqm.quarter_id INTO v_quarter_id
  FROM find_nearest_quarter_member(p_point, 100) nqm;

  IF v_quarter_id IS NOT NULL THEN
    -- Pruefe Max-Radius (200m)
    v_new_centroid := calculate_new_centroid(v_quarter_id, p_point);
    v_radius_ok := check_max_radius(v_quarter_id, v_new_centroid, 200);

    IF v_radius_ok THEN
      -- Centroid aktualisieren
      UPDATE quarters SET
        geo_center = v_new_centroid,
        center_lat = ST_Y(v_new_centroid),
        center_lng = ST_X(v_new_centroid),
        updated_at = NOW()
      WHERE id = v_quarter_id;

      RETURN v_quarter_id;
    END IF;
    -- Max-Radius ueberschritten → weiter zu Schritt 3
  END IF;

  -- Schritt 2: Seeding-Quartier im 100m Radius?
  SELECT nqm.quarter_id INTO v_quarter_id
  FROM find_nearest_quarter_member(p_point, 100) nqm
  INNER JOIN quarters q ON q.id = nqm.quarter_id
  WHERE q.status = 'seeding';

  IF v_quarter_id IS NOT NULL THEN
    -- Centroid aktualisieren, Status → activating
    v_new_centroid := calculate_new_centroid(v_quarter_id, p_point);
    UPDATE quarters SET
      geo_center = v_new_centroid,
      center_lat = ST_Y(v_new_centroid),
      center_lng = ST_X(v_new_centroid),
      status = 'activating',
      updated_at = NOW()
    WHERE id = v_quarter_id;

    RETURN v_quarter_id;
  END IF;

  -- Schritt 3: Neues Quartier erstellen (seeding)
  v_new_id := gen_random_uuid();
  INSERT INTO quarters (
    id, name, slug, city, state, country,
    center_lat, center_lng, geo_center,
    zoom_level, status, created_at, updated_at
  ) VALUES (
    v_new_id,
    p_quarter_name,
    LOWER(REPLACE(REPLACE(p_quarter_name, ' ', '-'), '—', '-')) || '-' || LEFT(v_new_id::text, 8),
    p_city,
    p_state,
    p_country,
    ST_Y(p_point),
    ST_X(p_point),
    p_point,
    16,
    'seeding',
    NOW(),
    NOW()
  );

  RETURN v_new_id;
END;
$$;

-- Kommentar fuer Dokumentation
COMMENT ON FUNCTION assign_point_to_quarter IS
  'Wachsender-Cluster-Algorithmus: 100m Beitrittsradius, 200m Max-Radius. '
  'Erstellt automatisch neue Quartiere wenn kein bestehendes in Reichweite.';
