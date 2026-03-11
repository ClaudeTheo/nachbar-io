-- 029_care_documents.sql
CREATE TABLE care_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id uuid REFERENCES users(id) NOT NULL,
  type text NOT NULL CHECK (type IN (
    'care_report_daily','care_report_weekly','care_report_monthly',
    'emergency_log','medication_report','care_aid_application',
    'tax_summary','usage_report'
  )),
  title text NOT NULL,
  period_start date,
  period_end date,
  generated_by uuid REFERENCES users(id) NOT NULL,
  storage_path text NOT NULL,
  file_size_bytes int,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE care_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "care_docs_select_own" ON care_documents
  FOR SELECT USING (senior_id = auth.uid());
CREATE POLICY "care_docs_select_helper" ON care_documents
  FOR SELECT USING (is_care_helper_for(senior_id));
CREATE POLICY "care_docs_select_admin" ON care_documents
  FOR SELECT USING (is_admin());
CREATE POLICY "care_docs_insert" ON care_documents
  FOR INSERT WITH CHECK (
    (is_care_helper_for(senior_id) AND care_helper_role(senior_id) IN ('relative','care_service'))
    OR is_admin()
  );
