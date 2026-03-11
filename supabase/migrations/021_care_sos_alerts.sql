-- 021_care_sos_alerts.sql
CREATE TABLE care_sos_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id uuid REFERENCES users(id) NOT NULL,
  category text NOT NULL CHECK (category IN (
    'medical_emergency','general_help','visit_wanted','shopping','medication_help'
  )),
  status text NOT NULL DEFAULT 'triggered' CHECK (status IN (
    'triggered','notified','accepted','helper_enroute','resolved','cancelled','escalated'
  )),
  current_escalation_level int DEFAULT 1 CHECK (current_escalation_level BETWEEN 1 AND 4),
  escalated_at timestamptz[] DEFAULT '{}',
  accepted_by uuid REFERENCES users(id),
  resolved_by uuid REFERENCES users(id),
  resolved_at timestamptz,
  notes text,
  source text DEFAULT 'app' CHECK (source IN ('app','device','checkin_timeout')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_care_sos_status ON care_sos_alerts(status);
CREATE INDEX idx_care_sos_senior ON care_sos_alerts(senior_id);
CREATE INDEX idx_care_sos_escalation ON care_sos_alerts(status, current_escalation_level, created_at);

ALTER TABLE care_sos_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "care_sos_select_own" ON care_sos_alerts
  FOR SELECT USING (senior_id = auth.uid());
CREATE POLICY "care_sos_select_helper" ON care_sos_alerts
  FOR SELECT USING (is_care_helper_for(senior_id));
CREATE POLICY "care_sos_select_admin" ON care_sos_alerts
  FOR SELECT USING (is_admin());
CREATE POLICY "care_sos_insert_own" ON care_sos_alerts
  FOR INSERT WITH CHECK (senior_id = auth.uid());
CREATE POLICY "care_sos_update_authorized" ON care_sos_alerts
  FOR UPDATE USING (
    senior_id = auth.uid()
    OR is_care_helper_for(senior_id)
    OR is_admin()
  );
