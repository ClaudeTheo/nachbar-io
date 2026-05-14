-- 198_pilot_household_access_codes.sql
-- Pilot 0: haushaltsgebundene Brief-/Ersatzcodes.
-- File-first only: nicht automatisch gegen Prod anwenden.

CREATE TABLE IF NOT EXISTS pilot_household_access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter_id uuid NOT NULL REFERENCES quarters(id) ON DELETE CASCADE,
  household_id uuid REFERENCES households(id) ON DELETE CASCADE,
  code_hash text NOT NULL UNIQUE,
  code_hint text NOT NULL,
  code_kind text NOT NULL CHECK (code_kind IN ('primary', 'replacement')),
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'assigned', 'claimed', 'revoked', 'expired')),
  max_claims integer NOT NULL DEFAULT 1 CHECK (max_claims = 1),
  claim_count integer NOT NULL DEFAULT 0 CHECK (claim_count >= 0 AND claim_count <= max_claims),
  assigned_at timestamptz,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz,
  batch_label text NOT NULL DEFAULT 'pilot-0',
  printed_at timestamptz,
  support_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pilot_household_access_codes_household_required_for_primary
    CHECK (code_kind <> 'primary' OR household_id IS NOT NULL),
  CONSTRAINT pilot_household_access_codes_claimed_consistency
    CHECK (
      (status <> 'claimed' AND claimed_by IS NULL AND claimed_at IS NULL AND claim_count = 0)
      OR
      (status = 'claimed' AND claimed_by IS NOT NULL AND claimed_at IS NOT NULL AND claim_count = 1)
    )
);

CREATE INDEX IF NOT EXISTS idx_pilot_household_access_codes_quarter_status
  ON pilot_household_access_codes(quarter_id, status);

CREATE INDEX IF NOT EXISTS idx_pilot_household_access_codes_household
  ON pilot_household_access_codes(household_id, code_kind, status)
  WHERE household_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pilot_household_access_codes_replacement_pool
  ON pilot_household_access_codes(quarter_id, status, created_at)
  WHERE code_kind = 'replacement' AND household_id IS NULL;

ALTER TABLE pilot_household_access_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY pilot_household_access_codes_admin_select
  ON pilot_household_access_codes
  FOR SELECT USING (
    is_super_admin()
    OR is_quarter_admin_for(quarter_id)
  );

CREATE POLICY pilot_household_access_codes_admin_insert
  ON pilot_household_access_codes
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR is_quarter_admin_for(quarter_id)
  );

CREATE POLICY pilot_household_access_codes_admin_update
  ON pilot_household_access_codes
  FOR UPDATE USING (
    is_super_admin()
    OR is_quarter_admin_for(quarter_id)
  )
  WITH CHECK (
    is_super_admin()
    OR is_quarter_admin_for(quarter_id)
  );

COMMENT ON TABLE pilot_household_access_codes IS
  'Pilot 0 one-time household access code inventory. Cleartext codes are never stored.';

COMMENT ON COLUMN pilot_household_access_codes.code_hint IS
  'Non-secret display hint, e.g. formatted prefix plus last four characters for admin support.';
