-- Migration 103: Anamnese-Vorlagen + Forms-Erweiterung
-- Zweck: Aerzte erstellen Anamnese-Vorlagen, Patienten fuellen per Token aus

-- Vorlagen-Tabelle
CREATE TABLE anamnesis_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_anamnesis_templates_doctor ON anamnesis_templates(doctor_id);

ALTER TABLE anamnesis_templates ENABLE ROW LEVEL SECURITY;

-- RLS: Nur eigener Arzt kann lesen/schreiben
CREATE POLICY "templates_doctor_read" ON anamnesis_templates
  FOR SELECT USING (doctor_id = auth.uid());
CREATE POLICY "templates_doctor_insert" ON anamnesis_templates
  FOR INSERT WITH CHECK (doctor_id = auth.uid());
CREATE POLICY "templates_doctor_update" ON anamnesis_templates
  FOR UPDATE USING (doctor_id = auth.uid());
CREATE POLICY "templates_doctor_delete" ON anamnesis_templates
  FOR DELETE USING (doctor_id = auth.uid());

-- Bestehende anamnesis_forms erweitern
ALTER TABLE anamnesis_forms ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES anamnesis_templates(id);
ALTER TABLE anamnesis_forms ADD COLUMN IF NOT EXISTS access_token TEXT UNIQUE;
ALTER TABLE anamnesis_forms ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE anamnesis_forms ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'expired'));

CREATE INDEX idx_anamnesis_forms_token ON anamnesis_forms(access_token) WHERE access_token IS NOT NULL;
CREATE INDEX idx_anamnesis_forms_appointment ON anamnesis_forms(appointment_id);

-- Patienten koennen per Token zugreifen (ohne Login)
CREATE POLICY "anamnesis_token_access" ON anamnesis_forms
  FOR SELECT USING (
    access_token IS NOT NULL
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Patienten koennen per Token ausfuellen
CREATE POLICY "anamnesis_token_submit" ON anamnesis_forms
  FOR UPDATE USING (
    access_token IS NOT NULL
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now())
  ) WITH CHECK (status = 'submitted');

-- ============================================================
-- Combined from 103_quarter_auto_clustering.sql to keep migration versions unique locally.
-- ============================================================

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


-- ============================================================
-- Combined from 103_waste_area_split.sql to keep migration versions unique locally.
-- ============================================================

-- Migration 103: Bad Säckingen Abfuhrgruppen-Split
-- BS-ALL → BS-A (Gruppe A) + BS-B (Gruppe B)
-- Befund: Mindestens 2 Abfuhrgruppen, unterschiedliche Gelber-Sack/Papier-Tage
-- Doku: memory/project_session_2026_03_19_waste_discovery.md

-- ============================================================
-- 1. quarters: waste_area_id als optionaler Direct-Override
-- ============================================================
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS waste_area_id UUID REFERENCES waste_collection_areas(id);
COMMENT ON COLUMN quarters.waste_area_id IS 'Direktzuweisung Abfuhrgebiet — ueberschreibt municipality-basiertes Matching';

-- ============================================================
-- 2. waste_collection_areas: deprecated-Flag
-- ============================================================
ALTER TABLE waste_collection_areas ADD COLUMN IF NOT EXISTS deprecated BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN waste_collection_areas.deprecated IS 'Gebiet ist veraltet, wird nicht mehr gesynct';

-- ============================================================
-- 3. BS-A anlegen (Gruppe A — Gelber Sack Di, Papier Fr)
-- ============================================================
INSERT INTO waste_collection_areas (
  source_id, area_name, area_code, municipality, postal_code, street_patterns, ics_url
) VALUES (
  (SELECT id FROM waste_source_registry WHERE slug = 'awb-waldshut'),
  'Bad Säckingen Gruppe A',
  'BS-A',
  'Bad Säckingen',
  '79713',
  ARRAY[
    'Purkersdorfer Str.%',
    'Sanarystr.%',
    'Oberer Rebberg%'
  ],
  'https://eigbeab.landkreis-waldshut.de/WasteManagementWaldshut/WasteManagementServiceServlet?ApplicationName=Calendar&SubmitAction=sync&StandortID=1045914001&Fra=BT;S;BIO;RM;GS'
);

-- ============================================================
-- 4. BS-B anlegen (Gruppe B — Gelber Sack Mi, Papier Do)
-- ============================================================
INSERT INTO waste_collection_areas (
  source_id, area_name, area_code, municipality, postal_code, street_patterns, ics_url
) VALUES (
  (SELECT id FROM waste_source_registry WHERE slug = 'awb-waldshut'),
  'Bad Säckingen Gruppe B',
  'BS-B',
  'Bad Säckingen',
  '79713',
  ARRAY[
    'Bahnhofstr.%',
    'Hauptstraße%',
    'Waldshuter Str.%'
  ],
  'https://eigbeab.landkreis-waldshut.de/WasteManagementWaldshut/WasteManagementServiceServlet?ApplicationName=Calendar&SubmitAction=sync&StandortID=1029795001&Fra=BT;S;BIO;RM;GS'
);

-- ============================================================
-- 5. Bestehende Termine von BS-ALL → BS-A umhaengen
--    (Daten stammten von StandortID 1045914001 = Gruppe A)
-- ============================================================
UPDATE waste_collection_dates
SET area_id = (SELECT id FROM waste_collection_areas WHERE area_code = 'BS-A')
WHERE area_id = (SELECT id FROM waste_collection_areas WHERE area_code = 'BS-ALL');

-- ============================================================
-- 6. BS-ALL als deprecated markieren (nicht loeschen — Referenzintegritaet)
-- ============================================================
UPDATE waste_collection_areas
SET deprecated = true,
    area_name = 'Bad Säckingen (veraltet — BS-ALL)',
    ics_url = NULL
WHERE area_code = 'BS-ALL';

-- ============================================================
-- 7. Pilot-Quartier direkt auf BS-A setzen
-- ============================================================
UPDATE quarters
SET waste_area_id = (SELECT id FROM waste_collection_areas WHERE area_code = 'BS-A')
WHERE city = 'Bad Säckingen' AND name = 'Bad Säckingen Altstadt';

-- ============================================================
-- 8. View aktualisieren: waste_area_id bevorzugen
-- ============================================================
CREATE OR REPLACE VIEW quarter_collection_areas AS
SELECT
  q.id AS quarter_id,
  q.name AS quarter_name,
  wca.id AS area_id,
  wca.area_name,
  wca.ics_url,
  wsr.id AS source_id,
  wsr.name AS source_name,
  wsr.slug AS source_slug
FROM quarters q
JOIN waste_collection_areas wca ON (
  CASE
    -- Direktzuweisung: waste_area_id auf dem Quartier
    WHEN q.waste_area_id IS NOT NULL THEN wca.id = q.waste_area_id
    -- Fallback: municipality-basiertes Matching (nur nicht-deprecated)
    ELSE (
      wca.municipality = q.city
      AND (wca.postal_code IS NULL OR wca.postal_code = q.postal_code)
      AND wca.deprecated = false
    )
  END
)
JOIN waste_source_registry wsr ON wsr.id = wca.source_id
WHERE wsr.sync_enabled = true;
