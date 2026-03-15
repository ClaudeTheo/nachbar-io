-- 062_care_shopping_requests.sql
-- Einkaufshilfe: Senioren erstellen Einkaufslisten, Nachbarn uebernehmen sie
-- DSGVO: Keine Art-9-Daten, RLS reicht. Keine Verschluesselung noetig.

CREATE TABLE care_shopping_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid REFERENCES users(id) NOT NULL,
  quarter_id uuid REFERENCES quarters(id) NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  note text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','claimed','shopping','delivered','confirmed','cancelled')),
  claimed_by uuid REFERENCES users(id),
  claimed_at timestamptz,
  due_date date,
  delivered_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_shopping_requests_quarter ON care_shopping_requests(quarter_id, status);
CREATE INDEX idx_shopping_requests_requester ON care_shopping_requests(requester_id);
CREATE INDEX idx_shopping_requests_claimed ON care_shopping_requests(claimed_by);

CREATE TRIGGER care_shopping_requests_updated_at
  BEFORE UPDATE ON care_shopping_requests
  FOR EACH ROW EXECUTE FUNCTION care_update_updated_at();

ALTER TABLE care_shopping_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shopping_select_quarter" ON care_shopping_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      JOIN households h ON h.id = hm.household_id
      WHERE hm.user_id = auth.uid() AND h.quarter_id = care_shopping_requests.quarter_id
    )
  );

CREATE POLICY "shopping_insert_own" ON care_shopping_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "shopping_update" ON care_shopping_requests
  FOR UPDATE USING (
    auth.uid() = requester_id OR auth.uid() = claimed_by OR is_admin()
  );

CREATE POLICY "shopping_delete" ON care_shopping_requests
  FOR DELETE USING (
    (auth.uid() = requester_id AND status = 'open') OR is_admin()
  );
