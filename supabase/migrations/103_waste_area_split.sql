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
