-- 020_care_profiles.sql
CREATE TABLE care_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  care_level text CHECK (care_level IN ('none','1','2','3','4','5')) DEFAULT 'none',
  emergency_contacts jsonb DEFAULT '[]',
  medical_notes text,
  preferred_hospital text,
  insurance_number text,
  checkin_times jsonb DEFAULT '["08:00","20:00"]',
  checkin_enabled boolean DEFAULT true,
  escalation_config jsonb DEFAULT '{"escalate_to_level_2_after_minutes":5,"escalate_to_level_3_after_minutes":15,"escalate_to_level_4_after_minutes":30}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TRIGGER care_profiles_updated_at
  BEFORE UPDATE ON care_profiles
  FOR EACH ROW EXECUTE FUNCTION care_update_updated_at();

ALTER TABLE care_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "care_profiles_select_own" ON care_profiles
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "care_profiles_select_helper" ON care_profiles
  FOR SELECT USING (is_care_helper_for(user_id));
CREATE POLICY "care_profiles_select_admin" ON care_profiles
  FOR SELECT USING (is_admin());
CREATE POLICY "care_profiles_insert_own" ON care_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "care_profiles_update_own" ON care_profiles
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "care_profiles_update_helper" ON care_profiles
  FOR UPDATE USING (
    is_care_helper_for(user_id)
    AND care_helper_role(user_id) IN ('relative', 'care_service')
  );
CREATE POLICY "care_profiles_update_admin" ON care_profiles
  FOR UPDATE USING (is_admin());
