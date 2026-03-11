-- 023_care_checkins.sql
CREATE TABLE care_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id uuid REFERENCES users(id) NOT NULL,
  status text NOT NULL CHECK (status IN ('ok','not_well','need_help','missed','reminded')),
  mood text CHECK (mood IN ('good','neutral','bad')),
  note text,
  scheduled_at timestamptz NOT NULL,
  completed_at timestamptz,
  reminder_sent_at timestamptz,
  escalated boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_care_checkins_senior ON care_checkins(senior_id);
CREATE INDEX idx_care_checkins_scheduled ON care_checkins(scheduled_at);

ALTER TABLE care_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "care_checkins_select_own" ON care_checkins
  FOR SELECT USING (senior_id = auth.uid());
CREATE POLICY "care_checkins_select_helper" ON care_checkins
  FOR SELECT USING (is_care_helper_for(senior_id));
CREATE POLICY "care_checkins_select_admin" ON care_checkins
  FOR SELECT USING (is_admin());
CREATE POLICY "care_checkins_insert_own" ON care_checkins
  FOR INSERT WITH CHECK (senior_id = auth.uid());
CREATE POLICY "care_checkins_update" ON care_checkins
  FOR UPDATE USING (senior_id = auth.uid() OR is_admin());
