-- 094_youth_profiles_and_consents.sql
-- Jugend-Modul: Profile + Elternfreigabe

-- Jugend-Profile
CREATE TABLE IF NOT EXISTS youth_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  birth_year INT NOT NULL CHECK (birth_year >= 2000 AND birth_year <= EXTRACT(YEAR FROM NOW())),
  age_group TEXT NOT NULL CHECK (age_group IN ('u16', '16_17')),
  access_level TEXT NOT NULL DEFAULT 'basis' CHECK (access_level IN ('basis', 'erweitert', 'freigeschaltet')),
  phone_hash TEXT NOT NULL,
  quarter_id UUID REFERENCES quarters(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_youth_profiles_quarter ON youth_profiles(quarter_id);
CREATE INDEX idx_youth_profiles_phone_hash ON youth_profiles(phone_hash);

-- RLS
ALTER TABLE youth_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY youth_profiles_select_own ON youth_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY youth_profiles_select_org ON youth_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('admin', 'viewer')
        AND quarter_id = ANY(om.assigned_quarters)
    )
  );

CREATE POLICY youth_profiles_update_own ON youth_profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY youth_profiles_insert_service ON youth_profiles
  FOR INSERT WITH CHECK (true);  -- service_role only via Edge Function

-- Updated-at Trigger
CREATE TRIGGER youth_profiles_updated_at
  BEFORE UPDATE ON youth_profiles
  FOR EACH ROW EXECUTE FUNCTION care_update_updated_at();

-- Elternfreigabe
CREATE TABLE IF NOT EXISTS youth_guardian_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guardian_name TEXT,  -- verschluesselt (AES-256-GCM)
  guardian_phone_hash TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  token_last_sent_at TIMESTAMPTZ,
  token_send_count INT NOT NULL DEFAULT 1,
  consent_text_version TEXT NOT NULL DEFAULT 'v1.0-2026-03-19',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'granted', 'revoked', 'expired')),
  granted_via TEXT CHECK (granted_via IN ('sms_link', 'in_app', 'org_verified')),
  granted_at TIMESTAMPTZ,
  granted_ip TEXT,      -- verschluesselt
  granted_user_agent TEXT,  -- verschluesselt
  revoked_via TEXT CHECK (revoked_via IN ('sms_link', 'in_app', 'support', 'org_admin')),
  revoked_at TIMESTAMPTZ,
  revoked_ip TEXT,      -- verschluesselt
  revoked_user_agent TEXT,  -- verschluesselt
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_youth_consents_youth ON youth_guardian_consents(youth_user_id);
CREATE INDEX idx_youth_consents_token ON youth_guardian_consents(token_hash);
CREATE INDEX idx_youth_consents_status ON youth_guardian_consents(status);

-- RLS
ALTER TABLE youth_guardian_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY youth_consents_select_own ON youth_guardian_consents
  FOR SELECT USING (auth.uid() = youth_user_id);

CREATE POLICY youth_consents_insert_own ON youth_guardian_consents
  FOR INSERT WITH CHECK (auth.uid() = youth_user_id);

-- Feature-Flags registrieren
INSERT INTO feature_flags (key, enabled, description) VALUES
  ('YOUTH_MODULE', false, 'Master-Switch Jugend-Modul pro Quartier'),
  ('YOUTH_CHALLENGES', false, 'Challenges-System (Phase 2)'),
  ('YOUTH_CERTIFICATES', false, 'Engagement-Zertifikate (Phase 2)'),
  ('YOUTH_MENTORING', false, 'Mentoring org-begleitet (Phase 2)'),
  ('YOUTH_GUTSCHEINE', false, 'Gutschein-System (Phase 3)'),
  ('YOUTH_EINKAUFSHILFE', false, 'Einkauf mit Geld (Phase 3)')
ON CONFLICT (key) DO NOTHING;
