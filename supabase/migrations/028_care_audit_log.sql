-- 028_care_audit_log.sql
CREATE TABLE care_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id uuid REFERENCES users(id) NOT NULL,
  actor_id uuid REFERENCES users(id) NOT NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'sos_triggered','sos_accepted','sos_resolved','sos_escalated','sos_cancelled',
    'checkin_ok','checkin_not_well','checkin_missed','checkin_escalated',
    'medication_taken','medication_skipped','medication_missed','medication_snoozed',
    'appointment_confirmed','appointment_missed',
    'visit_logged','helper_registered','helper_verified',
    'document_generated','profile_updated','subscription_changed'
  )),
  reference_type text,
  reference_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_care_audit_senior ON care_audit_log(senior_id);
CREATE INDEX idx_care_audit_created ON care_audit_log(created_at);

-- Append-only Triggers (DB-Level Enforcement)
CREATE TRIGGER no_audit_update
  BEFORE UPDATE ON care_audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

CREATE TRIGGER no_audit_delete
  BEFORE DELETE ON care_audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

ALTER TABLE care_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "care_audit_insert" ON care_audit_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "care_audit_select_own" ON care_audit_log
  FOR SELECT USING (senior_id = auth.uid());
CREATE POLICY "care_audit_select_helper" ON care_audit_log
  FOR SELECT USING (is_care_helper_for(senior_id));
CREATE POLICY "care_audit_select_admin" ON care_audit_log
  FOR SELECT USING (is_admin());
