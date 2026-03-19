-- Migration 097: Maengelmelder — Community-Meldungen + Kommentare
-- Zweck: Bewohner melden Maengel im Quartier (NICHT offiziell)

-- Meldungskategorien
CREATE TYPE report_category AS ENUM (
  'street', 'lighting', 'greenery', 'waste', 'vandalism', 'other'
);

-- Meldungsstatus
CREATE TYPE report_status AS ENUM (
  'open', 'acknowledged', 'in_progress', 'resolved'
);

-- Maengelmelder-Meldungen
CREATE TABLE municipal_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quarter_id UUID NOT NULL REFERENCES quarters(id) ON DELETE CASCADE,
  category report_category NOT NULL,
  description TEXT CHECK (char_length(description) <= 500),
  photo_url TEXT,
  location GEOGRAPHY(Point, 4326),
  location_text TEXT,
  status report_status DEFAULT 'open',
  status_note TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Kommentare zu Meldungen
CREATE TABLE municipal_report_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES municipal_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (char_length(text) <= 300),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indizes
CREATE INDEX idx_municipal_reports_quarter ON municipal_reports(quarter_id);
CREATE INDEX idx_municipal_reports_user ON municipal_reports(user_id);
CREATE INDEX idx_municipal_reports_status ON municipal_reports(status);
CREATE INDEX idx_municipal_reports_created ON municipal_reports(created_at);
CREATE INDEX idx_municipal_reports_location ON municipal_reports USING GIST(location);
CREATE INDEX idx_report_comments_report ON municipal_report_comments(report_id);

-- RLS aktivieren
ALTER TABLE municipal_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipal_report_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies: municipal_reports

-- Erstellen: Authentifizierter Bewohner des Quartiers
CREATE POLICY "reports_insert" ON municipal_reports
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND quarter_id IN (
      SELECT h.quarter_id FROM household_members hm
      JOIN households h ON h.id = hm.household_id
      WHERE hm.user_id = auth.uid()
    )
  );

-- Lesen: Quartierbewohner sehen alle Meldungen ihres Quartiers
-- (Ersteller-Name wird im Frontend ausgeblendet, nicht per RLS)
CREATE POLICY "reports_select" ON municipal_reports
  FOR SELECT USING (
    quarter_id IN (
      SELECT h.quarter_id FROM household_members hm
      JOIN households h ON h.id = hm.household_id
      WHERE hm.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Status aendern: Nur org_admin oder globaler Admin
CREATE POLICY "reports_update_admin" ON municipal_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM org_members om
      JOIN organizations o ON o.id = om.org_id AND o.verification_status = 'verified'
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
      AND quarter_id = ANY(om.assigned_quarters)
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Loeschen: Ersteller (eigene) oder org_admin
CREATE POLICY "reports_delete" ON municipal_reports
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM org_members om
      JOIN organizations o ON o.id = om.org_id AND o.verification_status = 'verified'
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
      AND quarter_id = ANY(om.assigned_quarters)
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- RLS Policies: municipal_report_comments

-- Erstellen: Quartierbewohner
CREATE POLICY "report_comments_insert" ON municipal_report_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND report_id IN (
      SELECT id FROM municipal_reports WHERE quarter_id IN (
        SELECT h.quarter_id FROM household_members hm
        JOIN households h ON h.id = hm.household_id
        WHERE hm.user_id = auth.uid()
      )
    )
  );

-- Lesen: Quartierbewohner (gleiche Sichtbarkeit wie Reports)
CREATE POLICY "report_comments_select" ON municipal_report_comments
  FOR SELECT USING (
    report_id IN (
      SELECT id FROM municipal_reports WHERE quarter_id IN (
        SELECT h.quarter_id FROM household_members hm
        JOIN households h ON h.id = hm.household_id
        WHERE hm.user_id = auth.uid()
      )
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Loeschen: Ersteller oder org_admin
CREATE POLICY "report_comments_delete" ON municipal_report_comments
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );
