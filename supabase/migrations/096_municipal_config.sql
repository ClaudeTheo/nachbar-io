-- Migration 096: Kommunal-Modul Foundation — Konfiguration + Muellkalender
-- Zweck: Multi-Stadt-faehige kommunale Konfiguration + Abfuhrtermine + Erinnerungen

-- Muellarten
CREATE TYPE waste_type AS ENUM (
  'restmuell', 'biomuell', 'papier', 'gelber_sack', 'gruenschnitt', 'sperrmuell'
);

-- Datenquelle fuer Muellkalender
CREATE TYPE waste_source AS ENUM ('manual', 'ical', 'api');

-- Erinnerungszeitpunkt
CREATE TYPE waste_remind_time AS ENUM ('evening_before', 'morning_of');

-- Kommunale Konfiguration pro Quartier (1:1)
CREATE TABLE municipal_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter_id UUID NOT NULL REFERENCES quarters(id) ON DELETE CASCADE,
  city_name TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'Baden-Württemberg',
  rathaus_url TEXT,
  rathaus_phone TEXT,
  rathaus_email TEXT,
  opening_hours JSONB DEFAULT '{}',
  features JSONB DEFAULT '{"reports": true, "waste_calendar": true, "announcements": true, "wiki": true, "service_links": true}',
  service_links JSONB DEFAULT '[]', -- [{label, url, icon, category}]
  wiki_entries JSONB DEFAULT '[]',  -- [{question, answer, category, links}]
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(quarter_id)
);

-- Muellkalender: Abfuhrtermine
CREATE TABLE waste_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter_id UUID NOT NULL REFERENCES quarters(id) ON DELETE CASCADE,
  waste_type waste_type NOT NULL,
  collection_date DATE NOT NULL,
  notes TEXT,
  source waste_source DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(quarter_id, waste_type, collection_date)
);

-- Muellkalender: Nutzer-Erinnerungen
CREATE TABLE waste_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  waste_type waste_type NOT NULL,
  enabled BOOLEAN DEFAULT true,
  remind_at waste_remind_time DEFAULT 'evening_before',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, waste_type)
);

-- Indizes
CREATE INDEX idx_waste_schedules_quarter ON waste_schedules(quarter_id);
CREATE INDEX idx_waste_schedules_date ON waste_schedules(collection_date);
CREATE INDEX idx_waste_schedules_quarter_date ON waste_schedules(quarter_id, collection_date);
CREATE INDEX idx_waste_reminders_user ON waste_reminders(user_id);

-- RLS aktivieren
ALTER TABLE municipal_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies: municipal_config
-- Lesen: Jeder authentifizierte Nutzer im gleichen Quartier
CREATE POLICY "municipal_config_select" ON municipal_config
  FOR SELECT USING (
    quarter_id IN (
      SELECT h.quarter_id FROM household_members hm
      JOIN households h ON h.id = hm.household_id
      WHERE hm.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Schreiben: Nur org_admin des Quartiers oder globaler Admin
CREATE POLICY "municipal_config_insert" ON municipal_config
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members om
      JOIN organizations o ON o.id = om.org_id AND o.verification_status = 'verified'
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
      AND quarter_id = ANY(om.assigned_quarters)
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "municipal_config_update" ON municipal_config
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM org_members om
      JOIN organizations o ON o.id = om.org_id AND o.verification_status = 'verified'
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
      AND quarter_id = ANY(om.assigned_quarters)
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- RLS Policies: waste_schedules
-- Lesen: Alle Quartierbewohner
CREATE POLICY "waste_schedules_select" ON waste_schedules
  FOR SELECT USING (
    quarter_id IN (
      SELECT h.quarter_id FROM household_members hm
      JOIN households h ON h.id = hm.household_id
      WHERE hm.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Schreiben: Nur org_admin oder globaler Admin
CREATE POLICY "waste_schedules_insert" ON waste_schedules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members om
      JOIN organizations o ON o.id = om.org_id AND o.verification_status = 'verified'
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
      AND quarter_id = ANY(om.assigned_quarters)
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "waste_schedules_update" ON waste_schedules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM org_members om
      JOIN organizations o ON o.id = om.org_id AND o.verification_status = 'verified'
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
      AND quarter_id = ANY(om.assigned_quarters)
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "waste_schedules_delete" ON waste_schedules
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM org_members om
      JOIN organizations o ON o.id = om.org_id AND o.verification_status = 'verified'
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
      AND quarter_id = ANY(om.assigned_quarters)
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- RLS Policies: waste_reminders
-- Nur eigene Eintraege
CREATE POLICY "waste_reminders_own" ON waste_reminders
  FOR ALL USING (user_id = auth.uid());
