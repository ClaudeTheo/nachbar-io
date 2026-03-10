-- 022_care_sos_responses.sql
CREATE TABLE care_sos_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sos_alert_id uuid REFERENCES care_sos_alerts(id) ON DELETE CASCADE NOT NULL,
  helper_id uuid REFERENCES users(id) NOT NULL,
  response_type text NOT NULL CHECK (response_type IN ('accepted','declined','arrived','completed')),
  eta_minutes int,
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE care_sos_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "care_sos_resp_select" ON care_sos_responses
  FOR SELECT USING (
    helper_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM care_sos_alerts
      WHERE id = sos_alert_id AND (
        senior_id = auth.uid()
        OR is_care_helper_for(senior_id)
        OR is_admin()
      )
    )
  );
CREATE POLICY "care_sos_resp_insert" ON care_sos_responses
  FOR INSERT WITH CHECK (helper_id = auth.uid());
