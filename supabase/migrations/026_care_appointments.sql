-- 026_care_appointments.sql
CREATE TABLE care_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id uuid REFERENCES users(id) NOT NULL,
  title text NOT NULL,
  type text DEFAULT 'other' CHECK (type IN ('doctor','care_service','therapy','other')),
  scheduled_at timestamptz NOT NULL,
  duration_minutes int DEFAULT 60,
  location text,
  reminder_minutes_before int[] DEFAULT '{60,15}',
  recurrence jsonb,
  managed_by uuid REFERENCES users(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER care_appointments_updated_at
  BEFORE UPDATE ON care_appointments
  FOR EACH ROW EXECUTE FUNCTION care_update_updated_at();

ALTER TABLE care_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "care_appt_select_own" ON care_appointments
  FOR SELECT USING (senior_id = auth.uid());
CREATE POLICY "care_appt_select_helper" ON care_appointments
  FOR SELECT USING (is_care_helper_for(senior_id));
CREATE POLICY "care_appt_select_admin" ON care_appointments
  FOR SELECT USING (is_admin());
CREATE POLICY "care_appt_insert" ON care_appointments
  FOR INSERT WITH CHECK (
    senior_id = auth.uid()
    OR (is_care_helper_for(senior_id) AND care_helper_role(senior_id) IN ('relative','care_service'))
    OR is_admin()
  );
CREATE POLICY "care_appt_update" ON care_appointments
  FOR UPDATE USING (
    managed_by = auth.uid()
    OR (is_care_helper_for(senior_id) AND care_helper_role(senior_id) IN ('relative','care_service'))
    OR is_admin()
  );
CREATE POLICY "care_appt_delete" ON care_appointments
  FOR DELETE USING (
    managed_by = auth.uid()
    OR (is_care_helper_for(senior_id) AND care_helper_role(senior_id) IN ('relative','care_service'))
    OR is_admin()
  );
