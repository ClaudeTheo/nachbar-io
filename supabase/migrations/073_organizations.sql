-- Migration 073: Organizations + Org Members (Pro Community)
-- Zweck: B2B-Verwaltung fuer Kommunen, Sozialdienste, Pflegeorganisationen

-- Organisationstypen
CREATE TYPE org_type AS ENUM ('municipality', 'care_service', 'housing', 'social_service');
CREATE TYPE org_verification_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE org_member_role AS ENUM ('admin', 'viewer');

-- Organisationen
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type org_type NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  address TEXT,
  hr_vr_number TEXT, -- Handelsregister/Vereinsregister
  verification_status org_verification_status DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  avv_signed_at TIMESTAMPTZ, -- Auftragsverarbeitungsvertrag
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Org-Mitglieder mit Quartier-Zuweisungen
CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role org_member_role DEFAULT 'viewer',
  assigned_quarters UUID[] DEFAULT '{}', -- Array von quarter_ids
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- Org-Audit-Log (jede Admin-Aktion)
CREATE TABLE org_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'mute_user', 'ban_user', 'create_med_plan', etc.
  target_user_id UUID REFERENCES auth.users(id),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indizes
CREATE INDEX idx_org_members_user ON org_members(user_id);
CREATE INDEX idx_org_members_org ON org_members(org_id);
CREATE INDEX idx_org_audit_org ON org_audit_log(org_id);
CREATE INDEX idx_org_audit_created ON org_audit_log(created_at);

-- RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_audit_log ENABLE ROW LEVEL SECURITY;

-- Policies: org_admin sieht eigene Org, viewer sieht eigene Org
CREATE POLICY "org_members_select" ON organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "org_members_own" ON org_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "org_audit_select" ON org_audit_log
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "org_audit_insert" ON org_audit_log
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'admin')
  );
