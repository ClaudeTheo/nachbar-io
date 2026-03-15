-- 064_care_tasks.sql
-- Aufgabentafel: Nachbarn bieten Hilfe an oder suchen Hilfe
-- DSGVO: Keine Art-9-Daten. Keine Adressen oeffentlich.

CREATE TABLE care_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES users(id) NOT NULL,
  quarter_id uuid REFERENCES quarters(id) NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'other'
    CHECK (category IN (
      'transport', 'shopping', 'companionship', 'garden',
      'tech_help', 'pet_care', 'household', 'other'
    )),
  urgency text DEFAULT 'normal'
    CHECK (urgency IN ('low', 'normal', 'urgent')),
  preferred_date date,
  preferred_time_from text,
  preferred_time_to text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'claimed', 'in_progress', 'done', 'confirmed', 'cancelled')),
  claimed_by uuid REFERENCES users(id),
  claimed_at timestamptz,
  completed_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_care_tasks_quarter ON care_tasks(quarter_id, status);
CREATE INDEX idx_care_tasks_creator ON care_tasks(creator_id);
CREATE INDEX idx_care_tasks_category ON care_tasks(category);

CREATE TRIGGER care_tasks_updated_at
  BEFORE UPDATE ON care_tasks
  FOR EACH ROW EXECUTE FUNCTION care_update_updated_at();

ALTER TABLE care_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select_quarter" ON care_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      JOIN households h ON h.id = hm.household_id
      WHERE hm.user_id = auth.uid() AND h.quarter_id = care_tasks.quarter_id
    )
  );

CREATE POLICY "tasks_insert" ON care_tasks
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "tasks_update" ON care_tasks
  FOR UPDATE USING (
    auth.uid() = creator_id OR auth.uid() = claimed_by OR is_admin()
  );

CREATE POLICY "tasks_delete" ON care_tasks
  FOR DELETE USING (
    (auth.uid() = creator_id AND status = 'open') OR is_admin()
  );
