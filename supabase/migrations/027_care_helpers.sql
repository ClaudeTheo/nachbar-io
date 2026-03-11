-- 027_care_helpers.sql
CREATE TABLE care_helpers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  role text NOT NULL CHECK (role IN ('neighbor','relative','care_service')),
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','revoked')),
  verified_by uuid REFERENCES users(id),
  assigned_seniors uuid[] DEFAULT '{}',
  availability jsonb,
  skills text[] DEFAULT '{}',
  response_count int DEFAULT 0,
  avg_response_minutes float,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX idx_care_helpers_assigned ON care_helpers USING GIN (assigned_seniors);

CREATE TRIGGER care_helpers_updated_at
  BEFORE UPDATE ON care_helpers
  FOR EACH ROW EXECUTE FUNCTION care_update_updated_at();

ALTER TABLE care_helpers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "care_helpers_select" ON care_helpers
  FOR SELECT USING (is_verified_member());
CREATE POLICY "care_helpers_insert_own" ON care_helpers
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "care_helpers_update_own" ON care_helpers
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "care_helpers_update_admin" ON care_helpers
  FOR UPDATE USING (is_admin());
