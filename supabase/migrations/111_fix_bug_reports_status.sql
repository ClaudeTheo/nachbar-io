-- Migration 111: Fix bug_reports status constraint
-- Root Cause: Code verwendet 'approved'/'rejected', DB erlaubt nur 'new'/'seen'/'fixed'/'wont_fix'
-- Loesung: Constraint erweitern um alle verwendeten Status-Werte
-- Bestehende Daten: Alle haben status='new' (kein Datenverlust)

-- 1. Alten Constraint entfernen
ALTER TABLE bug_reports DROP CONSTRAINT IF EXISTS bug_reports_status_check;

-- 2. Neuen Constraint mit allen Status-Werten setzen
ALTER TABLE bug_reports ADD CONSTRAINT bug_reports_status_check
  CHECK (status IN ('new', 'seen', 'approved', 'rejected', 'fixed', 'wont_fix'));

-- 3. Admin-Delete-Policy fehlt (Admin kann Reports loeschen)
CREATE POLICY "bug_reports_admin_delete" ON bug_reports
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );
