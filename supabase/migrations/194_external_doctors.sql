-- 194_external_doctors.sql
-- Nachbar.io — Verzeichnis-Tabelle fuer gecrawlte Aerzte (OSM Overpass).
--
-- Hintergrund: doctor_profiles ist fuer registrierte Aerzte mit user_id.
-- Fuer die Doctor-Discovery-Welle (Plan 2026-05-11) brauchen wir eine
-- separate Tabelle, die externe Verzeichnis-Eintraege (OSM, spaeter KBV)
-- aufnimmt, ohne mit registrierten Aerzten zu kollidieren.
--
-- Conventions:
-- - source = "osm" | "kbv" | "manual"
-- - source_ref = stabile ID der Quelle (OSM Node-ID, KBV-Hash, ...)
-- - specialization als text[] mit normalisierten KBV-Begriffen ("Allgemein",
--   "Augenheilkunde", "Orthopaedie", ...). Founder-Entscheidung 1a:
--   Whitelist mit "Allgemein" als Default-Bucket.
-- - last_seen_at: Tracking welche Eintraege bei letztem Crawl noch da waren.
--   Wenn last_seen_at zu alt → visible=false (manuelles Pruning).
--
-- File-first nach .claude/rules/db-migrations.md. Apply auf Prod nur mit
-- Founder-Go (Token MIG-194-APPLY-GO).

CREATE TABLE IF NOT EXISTS external_doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter_id UUID NOT NULL REFERENCES quarters(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('osm', 'kbv', 'manual')),
  source_ref TEXT NOT NULL,
  name TEXT NOT NULL,
  specialization TEXT[] NOT NULL DEFAULT '{Allgemein}',
  address TEXT,
  phone TEXT,
  website TEXT,
  email TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  distance_km DOUBLE PRECISION,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  visible BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT external_doctors_unique_per_source UNIQUE (quarter_id, source, source_ref)
);

CREATE INDEX IF NOT EXISTS idx_external_doctors_quarter
  ON external_doctors(quarter_id)
  WHERE visible = true;

CREATE INDEX IF NOT EXISTS idx_external_doctors_specialization
  ON external_doctors USING gin(specialization);

ALTER TABLE external_doctors ENABLE ROW LEVEL SECURITY;

-- Alle eingeloggten Nutzer sehen Verzeichnis-Eintraege (oeffentliche OSM-Daten).
DROP POLICY IF EXISTS external_doctors_select ON external_doctors;
CREATE POLICY external_doctors_select ON external_doctors
  FOR SELECT
  TO authenticated
  USING (visible = true);

-- Schreibend nur Service-Role (Cron / Onboard-Route).
DROP POLICY IF EXISTS external_doctors_insert_service ON external_doctors;
CREATE POLICY external_doctors_insert_service ON external_doctors
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS external_doctors_update_service ON external_doctors;
CREATE POLICY external_doctors_update_service ON external_doctors
  FOR UPDATE
  TO service_role
  USING (true);

DROP POLICY IF EXISTS external_doctors_delete_service ON external_doctors;
CREATE POLICY external_doctors_delete_service ON external_doctors
  FOR DELETE
  TO service_role
  USING (true);

COMMENT ON TABLE external_doctors IS
  'Gecrawlte Aerzte-Verzeichniseintraege (OSM Overpass, spaeter KBV). '
  'Pendant zu doctor_profiles (registrierte Aerzte). Mig 194.';
