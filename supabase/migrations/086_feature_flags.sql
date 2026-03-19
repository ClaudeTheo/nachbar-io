-- Migration 086: Feature-Flag-System (DB-driven)
-- Zweck: Dynamische Feature-Flags ersetzen statische Constants
-- Basis fuer das gesamte Vier-Versionen-Modell (Free/Plus/Pro Community/Pro Medical)
-- Hinweis: Alte feature_flags-Tabelle (leer, anderes Schema) wird ersetzt

-- Alte Tabelle entfernen (war leer, falsches Schema)
DROP TABLE IF EXISTS feature_flags CASCADE;

-- Tabelle: feature_flags
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" TEXT UNIQUE NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  required_roles TEXT[] DEFAULT '{}',
  required_plans TEXT[] DEFAULT '{}',
  enabled_quarters UUID[] DEFAULT '{}',
  admin_override BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index auf key (haeufige Lookups)
CREATE INDEX idx_feature_flags_key ON feature_flags ("key");

-- updated_at Trigger (nutzt bestehende care_update_updated_at Funktion aus Migration 019)
CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION care_update_updated_at();

-- RLS aktivieren
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- SELECT: Alle authentifizierten Nutzer (Client muss Flags pruefen koennen)
CREATE POLICY "feature_flags_select"
  ON feature_flags FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Nur Admins
CREATE POLICY "feature_flags_insert"
  ON feature_flags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- UPDATE: Nur Admins
CREATE POLICY "feature_flags_update"
  ON feature_flags FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- DELETE: Nur Admins
CREATE POLICY "feature_flags_delete"
  ON feature_flags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- Seed-Daten: 18 Feature-Flags (ON CONFLICT DO NOTHING fuer Idempotenz)
INSERT INTO feature_flags ("key", enabled, required_roles, required_plans, description) VALUES
  ('BOARD_ENABLED',        true,  '{}',                              '{}',                                    'Schwarzes Brett'),
  ('EVENTS_ENABLED',       true,  '{}',                              '{}',                                    'Events & RSVP'),
  ('INVITATIONS_ENABLED',  true,  '{}',                              '{}',                                    'Einladungssystem'),
  ('NEWS_ENABLED',         true,  '{}',                              '{}',                                    'KI-Quartier-News'),
  ('MARKETPLACE_ENABLED',  true,  '{}',                              '{}',                                    'Marktplatz'),
  ('BUSINESSES_ENABLED',   true,  '{}',                              '{}',                                    'Dienstleister'),
  ('HEARTBEAT_ENABLED',    true,  '{}',                              '{}',                                    'Heartbeat-System'),
  ('CAREGIVER_DASHBOARD',  true,  '{caregiver}',                     '{plus,pro_community,pro_medical}',      'Angehoerigen-Dashboard'),
  ('VIDEO_CALL_P2P',       true,  '{caregiver,resident}',            '{plus}',                                'Video-Call P2P'),
  ('ORG_DASHBOARD',        true,  '{org_admin,org_viewer}',          '{pro_community}',                       'Organisations-Dashboard'),
  ('MODERATION_ENABLED',   true,  '{org_admin}',                     '{pro_community}',                       'Content-Moderation'),
  ('QUARTER_STATS',        true,  '{org_admin,org_viewer}',          '{pro_community}',                       'Quartier-Statistiken'),
  ('APPOINTMENTS_ENABLED', true,  '{}',                              '{}',                                    'Terminbuchung'),
  ('VIDEO_CONSULTATION',   true,  '{doctor,doctor_admin}',           '{pro_medical}',                         'Video-Sprechstunde'),
  ('GDT_ENABLED',          true,  '{doctor,doctor_admin}',           '{pro_medical}',                         'GDT-Schnittstelle'),
  ('ADMIN_KPI',            false, '{admin}',                         '{}',                                    'KPI-Dashboard (nur Admin)'),
  ('REFERRAL_REWARDS',     false, '{resident,caregiver}',            '{free,plus}',                           'Referral-Belohnung'),
  ('QUARTER_PROGRESS',     true,  '{}',                              '{}',                                    'Quartier-Fortschritt')
ON CONFLICT ("key") DO NOTHING;
