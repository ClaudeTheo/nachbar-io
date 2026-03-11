-- 024_care_medications.sql
CREATE TABLE care_medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id uuid REFERENCES users(id) NOT NULL,
  name text NOT NULL,
  dosage text,
  schedule jsonb NOT NULL,
  instructions text,
  managed_by uuid REFERENCES users(id),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER care_medications_updated_at
  BEFORE UPDATE ON care_medications
  FOR EACH ROW EXECUTE FUNCTION care_update_updated_at();

ALTER TABLE care_medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "care_meds_select_own" ON care_medications
  FOR SELECT USING (senior_id = auth.uid());
CREATE POLICY "care_meds_select_helper" ON care_medications
  FOR SELECT USING (is_care_helper_for(senior_id));
CREATE POLICY "care_meds_select_admin" ON care_medications
  FOR SELECT USING (is_admin());
CREATE POLICY "care_meds_insert" ON care_medications
  FOR INSERT WITH CHECK (
    senior_id = auth.uid()
    OR (is_care_helper_for(senior_id) AND care_helper_role(senior_id) IN ('relative','care_service'))
    OR is_admin()
  );
CREATE POLICY "care_meds_update" ON care_medications
  FOR UPDATE USING (
    managed_by = auth.uid()
    OR (is_care_helper_for(senior_id) AND care_helper_role(senior_id) IN ('relative','care_service'))
    OR is_admin()
  );
