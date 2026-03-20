-- Migration 105: Amtsblatt-Integration
-- Zweck: Automatischer Import des Amtsblatts "Trompeterblättle" Bad Säckingen
-- PDF-Extraktion via Claude Haiku, Meldungen in municipal_announcements

-- Amtsblatt-Ausgaben tracken
CREATE TABLE amtsblatt_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter_id UUID NOT NULL REFERENCES quarters(id) ON DELETE CASCADE,
  issue_number TEXT NOT NULL,
  issue_date DATE NOT NULL,
  pdf_url TEXT NOT NULL,
  pages INTEGER,
  extracted_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(quarter_id, issue_number, issue_date)
);

-- Announcement-Kategorie ENUM erweitern (verein, soziales, entsorgung)
ALTER TYPE announcement_category ADD VALUE IF NOT EXISTS 'verein';
ALTER TYPE announcement_category ADD VALUE IF NOT EXISTS 'soziales';
ALTER TYPE announcement_category ADD VALUE IF NOT EXISTS 'entsorgung';

-- Amtsblatt-Referenz auf municipal_announcements
ALTER TABLE municipal_announcements
  ADD COLUMN IF NOT EXISTS amtsblatt_issue_id UUID REFERENCES amtsblatt_issues(id) ON DELETE SET NULL;

-- Index fuer Amtsblatt-Referenz
CREATE INDEX IF NOT EXISTS idx_announcements_amtsblatt ON municipal_announcements(amtsblatt_issue_id)
  WHERE amtsblatt_issue_id IS NOT NULL;

-- RLS fuer amtsblatt_issues
ALTER TABLE amtsblatt_issues ENABLE ROW LEVEL SECURITY;

-- Lesen: Alle Quartierbewohner
CREATE POLICY "amtsblatt_issues_select" ON amtsblatt_issues
  FOR SELECT USING (
    quarter_id IN (
      SELECT h.quarter_id FROM household_members hm
      JOIN households h ON h.id = hm.household_id
      WHERE hm.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Schreiben: Nur Admin (Cron-Job laeuft als Service-Role)
CREATE POLICY "amtsblatt_issues_admin" ON amtsblatt_issues
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );
