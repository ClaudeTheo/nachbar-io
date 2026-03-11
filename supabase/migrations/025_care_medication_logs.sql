-- 025_care_medication_logs.sql
CREATE TABLE care_medication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid REFERENCES care_medications(id) ON DELETE CASCADE NOT NULL,
  senior_id uuid REFERENCES users(id) NOT NULL,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('taken','skipped','snoozed','missed')),
  confirmed_at timestamptz,
  snoozed_until timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_care_med_logs_senior ON care_medication_logs(senior_id);
CREATE INDEX idx_care_med_logs_scheduled ON care_medication_logs(scheduled_at);

ALTER TABLE care_medication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "care_med_logs_select_own" ON care_medication_logs
  FOR SELECT USING (senior_id = auth.uid());
CREATE POLICY "care_med_logs_select_helper" ON care_medication_logs
  FOR SELECT USING (is_care_helper_for(senior_id));
CREATE POLICY "care_med_logs_select_admin" ON care_medication_logs
  FOR SELECT USING (is_admin());
CREATE POLICY "care_med_logs_insert_own" ON care_medication_logs
  FOR INSERT WITH CHECK (senior_id = auth.uid());
