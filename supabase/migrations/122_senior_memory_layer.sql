-- Migration 122: Senior Memory Layer
-- Tabellen: user_memory_facts, user_memory_consents, user_memory_audit_log

-- Enums
CREATE TYPE memory_category AS ENUM (
  'profile', 'routine', 'preference', 'contact', 'care_need', 'personal'
);

CREATE TYPE memory_consent_level AS ENUM ('basis', 'care', 'personal');

CREATE TYPE memory_visibility AS ENUM ('private', 'care_team');

CREATE TYPE memory_source AS ENUM ('self', 'caregiver', 'ai_learned', 'care_team');

CREATE TYPE memory_consent_type AS ENUM (
  'memory_basis', 'memory_care', 'memory_personal'
);

CREATE TYPE memory_actor_role AS ENUM (
  'senior', 'caregiver', 'ai', 'care_team', 'system'
);

CREATE TYPE memory_audit_action AS ENUM (
  'create', 'update', 'delete', 'reset', 'consent_grant', 'consent_revoke'
);

-- Haupttabelle: Fakten
CREATE TABLE user_memory_facts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category memory_category NOT NULL,
  consent_level memory_consent_level NOT NULL,
  key text NOT NULL,
  value text NOT NULL,
  value_encrypted boolean NOT NULL DEFAULT false,
  visibility memory_visibility NOT NULL DEFAULT 'private',
  org_id uuid REFERENCES organizations(id),
  source memory_source NOT NULL,
  source_user_id uuid REFERENCES auth.users(id),
  confidence float CHECK (confidence >= 0 AND confidence <= 1),
  confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category, key)
);

-- Consent-Tabelle
CREATE TABLE user_memory_consents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type memory_consent_type NOT NULL,
  granted boolean NOT NULL DEFAULT false,
  granted_at timestamptz,
  granted_by uuid REFERENCES auth.users(id),
  revoked_at timestamptz,
  UNIQUE (user_id, consent_type)
);

-- Audit-Log
CREATE TABLE user_memory_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id),
  actor_role memory_actor_role NOT NULL,
  target_user_id uuid NOT NULL REFERENCES auth.users(id),
  action memory_audit_action NOT NULL,
  fact_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indizes
CREATE INDEX idx_memory_facts_user_id ON user_memory_facts(user_id);
CREATE INDEX idx_memory_facts_category ON user_memory_facts(user_id, category);
CREATE INDEX idx_memory_consents_user ON user_memory_consents(user_id);
CREATE INDEX idx_memory_audit_target ON user_memory_audit_log(target_user_id);
CREATE INDEX idx_memory_audit_actor ON user_memory_audit_log(actor_user_id);

-- Updated_at Trigger
CREATE OR REPLACE FUNCTION update_memory_facts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_memory_facts_updated_at
  BEFORE UPDATE ON user_memory_facts
  FOR EACH ROW EXECUTE FUNCTION update_memory_facts_updated_at();

-- RLS aktivieren
ALTER TABLE user_memory_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memory_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memory_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: user_memory_facts
CREATE POLICY "user_own_facts_select" ON user_memory_facts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_own_facts_insert" ON user_memory_facts
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = source_user_id);

CREATE POLICY "user_own_facts_update" ON user_memory_facts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_own_facts_delete" ON user_memory_facts
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "caregiver_facts_select" ON user_memory_facts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM caregiver_links
      WHERE resident_id = user_memory_facts.user_id
        AND caregiver_id = auth.uid()
        AND revoked_at IS NULL
    )
  );

CREATE POLICY "caregiver_facts_insert" ON user_memory_facts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM caregiver_links
      WHERE resident_id = user_memory_facts.user_id
        AND caregiver_id = auth.uid()
        AND revoked_at IS NULL
    )
  );

CREATE POLICY "caregiver_facts_update" ON user_memory_facts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM caregiver_links
      WHERE resident_id = user_memory_facts.user_id
        AND caregiver_id = auth.uid()
        AND revoked_at IS NULL
    )
  );

CREATE POLICY "care_team_facts_select" ON user_memory_facts
  FOR SELECT USING (
    visibility = 'care_team'
    AND EXISTS (
      SELECT 1 FROM org_members
      WHERE org_id = user_memory_facts.org_id
        AND user_id = auth.uid()
    )
  );

-- RLS Policies: user_memory_consents
CREATE POLICY "user_own_consents" ON user_memory_consents
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "caregiver_consents" ON user_memory_consents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM caregiver_links
      WHERE resident_id = user_memory_consents.user_id
        AND caregiver_id = auth.uid()
        AND revoked_at IS NULL
    )
  );

-- RLS Policies: user_memory_audit_log
CREATE POLICY "user_own_audit" ON user_memory_audit_log
  FOR SELECT USING (auth.uid() = target_user_id);

CREATE POLICY "caregiver_audit" ON user_memory_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM caregiver_links
      WHERE resident_id = user_memory_audit_log.target_user_id
        AND caregiver_id = auth.uid()
        AND revoked_at IS NULL
    )
  );

-- Audit-Log: Insert immer erlaubt fuer authentifizierte User (via Server)
CREATE POLICY "insert_audit" ON user_memory_audit_log
  FOR INSERT WITH CHECK (auth.uid() = actor_user_id);
