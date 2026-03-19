-- Migration 102: Source-Driven Muellkalender
-- Abloesung des quartierbasierten Platzhalter-Systems durch automatische,
-- kommunenuebergreifende Terminversorgung.
-- Design: docs/plans/2026-03-19-waste-calendar-source-driven-design.md

-- 1. quarters-Tabelle erweitern (postal_code fehlt)
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- 2. Bestehenden waste_source Enum erweitern
ALTER TYPE waste_source ADD VALUE IF NOT EXISTS 'csv';
ALTER TYPE waste_source ADD VALUE IF NOT EXISTS 'scraper';

-- 3. Bestehenden waste_type Enum erweitern (neue Typen)
ALTER TYPE waste_type ADD VALUE IF NOT EXISTS 'altglas';
ALTER TYPE waste_type ADD VALUE IF NOT EXISTS 'elektroschrott';
ALTER TYPE waste_type ADD VALUE IF NOT EXISTS 'sondermuell';

-- 4. Connector-Typ Enum
DO $$ BEGIN
  CREATE TYPE connector_type AS ENUM ('ics', 'api', 'csv', 'scraper', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Sync-Status Enum
DO $$ BEGIN
  CREATE TYPE sync_status AS ENUM ('running', 'success', 'partial', 'error');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Tabelle: waste_source_registry — Quellenverwaltung
-- ============================================================
CREATE TABLE waste_source_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifikation
  name TEXT NOT NULL,                     -- 'Abfallwirtschaft Landkreis Waldshut'
  slug TEXT NOT NULL UNIQUE,              -- 'awb-waldshut'
  region TEXT NOT NULL,                   -- 'Landkreis Waldshut'

  -- Connector-Konfiguration
  connector_type connector_type NOT NULL DEFAULT 'manual',
  connector_config JSONB NOT NULL DEFAULT '{}',

  -- Sync-Steuerung
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  sync_interval_hours INT NOT NULL DEFAULT 24,
  last_sync_at TIMESTAMPTZ,
  last_sync_status sync_status,
  last_sync_error TEXT,
  last_sync_dates_count INT DEFAULT 0,
  next_sync_at TIMESTAMPTZ,

  -- Metadaten
  coverage_description TEXT,
  website_url TEXT,
  contact_info JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Tabelle: waste_collection_areas — Abfuhrgebiete
-- ============================================================
CREATE TABLE waste_collection_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES waste_source_registry(id) ON DELETE CASCADE,

  -- Gebietsdefinition
  area_name TEXT NOT NULL,                -- 'Bad Saeckingen Kernstadt'
  area_code TEXT,                         -- Interner Code des Entsorgers

  -- Geo-Zuordnung (von grob nach fein)
  municipality TEXT NOT NULL,             -- 'Bad Säckingen'
  district TEXT,                          -- 'Oberer Rebberg' (optional)
  postal_code TEXT,                       -- '79713'
  street_patterns TEXT[],                 -- ARRAY['Purkersdorfer%', 'Sanary%']

  -- ICS-spezifisch: Direkt-URL fuer dieses Gebiet
  ics_url TEXT,                           -- Subscription-URL fuer automatischen Sync

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (source_id, area_code)
);

CREATE INDEX idx_wca_municipality ON waste_collection_areas(municipality);
CREATE INDEX idx_wca_postal_code ON waste_collection_areas(postal_code);
CREATE INDEX idx_wca_source ON waste_collection_areas(source_id);

-- ============================================================
-- Tabelle: waste_collection_dates — Normalisierte Termine
-- ============================================================
CREATE TABLE waste_collection_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Herkunft
  source_id UUID NOT NULL REFERENCES waste_source_registry(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES waste_collection_areas(id) ON DELETE CASCADE,

  -- Termin
  waste_type waste_type NOT NULL,
  collection_date DATE NOT NULL,

  -- Zusatzinfos
  notes TEXT,
  time_hint TEXT,                         -- 'ab 6:00 Uhr bereitstellen'
  is_cancelled BOOLEAN DEFAULT false,
  replacement_date DATE,

  -- Sync-Tracking
  sync_batch_id UUID,
  raw_data JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (area_id, waste_type, collection_date)
);

CREATE INDEX idx_wcd_date ON waste_collection_dates(collection_date);
CREATE INDEX idx_wcd_area_date ON waste_collection_dates(area_id, collection_date);
CREATE INDEX idx_wcd_source ON waste_collection_dates(source_id);
-- Kein Partial Index mit CURRENT_DATE (nicht IMMUTABLE in PostgreSQL)

-- ============================================================
-- Tabelle: waste_sync_log — Sync-Protokoll
-- ============================================================
CREATE TABLE waste_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES waste_source_registry(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL DEFAULT gen_random_uuid(),

  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status sync_status NOT NULL DEFAULT 'running',

  dates_fetched INT DEFAULT 0,
  dates_inserted INT DEFAULT 0,
  dates_updated INT DEFAULT 0,
  dates_unchanged INT DEFAULT 0,
  dates_cancelled INT DEFAULT 0,

  error_message TEXT,
  error_details JSONB,

  has_changes BOOLEAN DEFAULT false,
  change_summary JSONB
);

CREATE INDEX idx_wsl_source ON waste_sync_log(source_id, started_at DESC);

-- ============================================================
-- View: quarter_collection_areas — Quartier → Abfuhrgebiete
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
  wca.municipality = q.city
  AND (
    wca.postal_code IS NULL OR wca.postal_code = q.postal_code
  )
)
JOIN waste_source_registry wsr ON wsr.id = wca.source_id
WHERE wsr.sync_enabled = true;

-- ============================================================
-- RLS Policies
-- ============================================================

-- waste_source_registry: Alle authentifizierten lesen, nur Admins schreiben
ALTER TABLE waste_source_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY wsr_read ON waste_source_registry FOR SELECT
  TO authenticated USING (true);
CREATE POLICY wsr_admin ON waste_source_registry FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- waste_collection_areas: Alle authentifizierten lesen
ALTER TABLE waste_collection_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY wca_read ON waste_collection_areas FOR SELECT
  TO authenticated USING (true);
CREATE POLICY wca_admin ON waste_collection_areas FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- waste_collection_dates: Alle authentifizierten lesen (keine sensiblen Daten)
ALTER TABLE waste_collection_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY wcd_read ON waste_collection_dates FOR SELECT
  TO authenticated USING (true);
CREATE POLICY wcd_admin ON waste_collection_dates FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- waste_sync_log: Nur Admins
ALTER TABLE waste_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY wsl_admin ON waste_sync_log FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Service-Role (fuer Cron/Edge Functions)
CREATE POLICY wcd_service ON waste_collection_dates FOR ALL
  TO service_role USING (true) WITH CHECK (true);
CREATE POLICY wsl_service ON waste_sync_log FOR ALL
  TO service_role USING (true) WITH CHECK (true);
CREATE POLICY wsr_service ON waste_source_registry FOR ALL
  TO service_role USING (true) WITH CHECK (true);
CREATE POLICY wca_service ON waste_collection_areas FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- Seed: AWB Waldshut als erste Quelle + Bad Saeckingen Area
-- ============================================================
INSERT INTO waste_source_registry (
  name, slug, region, connector_type, connector_config,
  sync_enabled, sync_interval_hours,
  coverage_description, website_url
) VALUES (
  'Abfallwirtschaft Landkreis Waldshut',
  'awb-waldshut',
  'Landkreis Waldshut',
  'ics',
  '{"encoding": "utf-8", "note": "ICS-Subscription von abfall-landkreis-waldshut.de — URL muss manuell aus Servlet kopiert werden"}'::jsonb,
  true,
  24,
  'Alle Gemeinden im Landkreis Waldshut',
  'https://www.abfall-landkreis-waldshut.de'
);

INSERT INTO waste_collection_areas (
  source_id, area_name, area_code, municipality, postal_code
) VALUES (
  (SELECT id FROM waste_source_registry WHERE slug = 'awb-waldshut'),
  'Bad Säckingen',
  'BS-ALL',
  'Bad Säckingen',
  '79713'
);

-- Postal Code fuer Bad Saeckingen Quartier setzen
UPDATE quarters SET postal_code = '79713' WHERE city = 'Bad Säckingen';
