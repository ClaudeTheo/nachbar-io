-- Migration 098: Kommunale Bekanntmachungen
-- Zweck: Redaktionelle Bekanntmachungen durch org_admin (getrennt von KI-News)

-- Bekanntmachungs-Kategorien
CREATE TYPE announcement_category AS ENUM (
  'verkehr', 'baustelle', 'veranstaltung', 'verwaltung', 'warnung', 'sonstiges'
);

-- Bekanntmachungen
CREATE TABLE municipal_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter_id UUID NOT NULL REFERENCES quarters(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) <= 500),
  source_url TEXT,
  category announcement_category DEFAULT 'sonstiges',
  pinned BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indizes
CREATE INDEX idx_announcements_quarter ON municipal_announcements(quarter_id);
CREATE INDEX idx_announcements_published ON municipal_announcements(published_at);
CREATE INDEX idx_announcements_expires ON municipal_announcements(expires_at);

-- RLS
ALTER TABLE municipal_announcements ENABLE ROW LEVEL SECURITY;

-- Lesen: Alle Quartierbewohner
CREATE POLICY "announcements_select" ON municipal_announcements
  FOR SELECT USING (
    quarter_id IN (
      SELECT h.quarter_id FROM household_members hm
      JOIN households h ON h.id = hm.household_id
      WHERE hm.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Erstellen/Bearbeiten: Nur org_admin oder globaler Admin
CREATE POLICY "announcements_insert" ON municipal_announcements
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM org_members om
        JOIN organizations o ON o.id = om.org_id AND o.verification_status = 'verified'
        WHERE om.user_id = auth.uid() AND om.role = 'admin'
        AND quarter_id = ANY(om.assigned_quarters)
      )
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    )
  );

CREATE POLICY "announcements_update" ON municipal_announcements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM org_members om
      JOIN organizations o ON o.id = om.org_id AND o.verification_status = 'verified'
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
      AND quarter_id = ANY(om.assigned_quarters)
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "announcements_delete" ON municipal_announcements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM org_members om
      JOIN organizations o ON o.id = om.org_id AND o.verification_status = 'verified'
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
      AND quarter_id = ANY(om.assigned_quarters)
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );
