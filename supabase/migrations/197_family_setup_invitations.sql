-- 197_family_setup_invitations.sql
-- Family-/Senior-Setup per kurzlebigem QR-/Kurzcode.
-- File-first only: nicht automatisch gegen Prod anwenden.

CREATE TABLE IF NOT EXISTS family_child_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_type text NOT NULL CHECK (relationship_type IN ('parent', 'guardian', 'other')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  consent_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (guardian_user_id, child_user_id)
);

CREATE INDEX IF NOT EXISTS idx_family_child_links_guardian
  ON family_child_links(guardian_user_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_family_child_links_child
  ON family_child_links(child_user_id)
  WHERE status = 'active';

ALTER TABLE family_child_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY family_child_links_select_guardian ON family_child_links
  FOR SELECT USING (auth.uid() = guardian_user_id);

CREATE POLICY family_child_links_select_child ON family_child_links
  FOR SELECT USING (auth.uid() = child_user_id);

CREATE POLICY family_child_links_update_guardian_revoke ON family_child_links
  FOR UPDATE USING (auth.uid() = guardian_user_id)
  WITH CHECK (auth.uid() = guardian_user_id);

CREATE TABLE IF NOT EXISTS family_setup_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  short_code_hash text UNIQUE,
  flow_type text NOT NULL CHECK (flow_type IN ('child_direct', 'child_friend', 'senior_setup')),
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('pending_parent_approval', 'ready', 'claimed', 'expired', 'revoked', 'needs_admin_review')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guardian_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  household_id uuid REFERENCES households(id) ON DELETE SET NULL,
  quarter_id uuid REFERENCES quarters(id) ON DELETE SET NULL,
  target_ui_mode text NOT NULL CHECK (target_ui_mode IN ('youth', 'senior', 'comfort')),
  relationship_type text,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_family_setup_invitations_creator
  ON family_setup_invitations(created_by, status);

CREATE INDEX IF NOT EXISTS idx_family_setup_invitations_guardian
  ON family_setup_invitations(guardian_user_id, status)
  WHERE guardian_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_family_setup_invitations_ready_expiry
  ON family_setup_invitations(expires_at)
  WHERE status = 'ready' AND used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_family_setup_invitations_flow
  ON family_setup_invitations(flow_type, status);

ALTER TABLE family_setup_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY family_setup_invitations_select_creator ON family_setup_invitations
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY family_setup_invitations_select_guardian ON family_setup_invitations
  FOR SELECT USING (auth.uid() = guardian_user_id);

CREATE POLICY family_setup_invitations_update_creator_revoke ON family_setup_invitations
  FOR UPDATE USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE TABLE IF NOT EXISTS family_setup_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid REFERENCES family_setup_invitations(id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  ip_hash text,
  user_agent_hash text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_family_setup_audit_invitation
  ON family_setup_audit(invitation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_family_setup_audit_actor
  ON family_setup_audit(actor_user_id, created_at DESC)
  WHERE actor_user_id IS NOT NULL;

ALTER TABLE family_setup_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY family_setup_audit_select_actor ON family_setup_audit
  FOR SELECT USING (auth.uid() = actor_user_id);

CREATE POLICY family_setup_audit_select_invitation_owner ON family_setup_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM family_setup_invitations fsi
      WHERE fsi.id = family_setup_audit.invitation_id
        AND (fsi.created_by = auth.uid() OR fsi.guardian_user_id = auth.uid())
    )
  );

ALTER TABLE caregiver_links
  ADD COLUMN IF NOT EXISTS setup_origin text CHECK (setup_origin IN ('manual_code', 'family_qr', 'device_pairing')),
  ADD COLUMN IF NOT EXISTS consent_status text NOT NULL DEFAULT 'active' CHECK (consent_status IN ('pending_senior_confirm', 'active', 'revoked')),
  ADD COLUMN IF NOT EXISTS profile_edit_allowed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sensitive_data_allowed boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_caregiver_links_family_qr
  ON caregiver_links(caregiver_id, resident_id)
  WHERE setup_origin = 'family_qr' AND revoked_at IS NULL;

COMMENT ON TABLE family_child_links IS
  'Guardian-child account links. Children cannot self-register; service-role creates links after setup claim.';

COMMENT ON TABLE family_setup_invitations IS
  'Single-use, short-lived setup invitations. Stores token hashes only; QR payloads must not contain PII.';

COMMENT ON TABLE family_setup_audit IS
  'Audit trail for family setup invitation creation, claim, approval and revocation.';

COMMENT ON COLUMN caregiver_links.consent_status IS
  'Senior setup consent state. Sensitive data remains gated unless explicit consent grants allow it.';
