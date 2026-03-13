-- Migration 053: Bug-Reports Tabelle fuer Tester-Feedback
-- Tester koennen per Klick einen Bug-Report mit Screenshot, Console-Errors
-- und Seitenkontext senden. Reports werden stuendlich analysiert.

CREATE TABLE IF NOT EXISTS bug_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  quarter_id UUID REFERENCES quarters(id),

  -- Wo der Bug gemeldet wurde
  page_url TEXT NOT NULL,
  page_title TEXT,

  -- Automatisch gesammelte Daten
  screenshot_url TEXT,
  console_errors JSONB DEFAULT '[]'::jsonb,
  browser_info JSONB DEFAULT '{}'::jsonb,
  page_meta JSONB DEFAULT '{}'::jsonb,

  -- Optionaler Kommentar vom Tester
  user_comment TEXT,

  -- Verwaltung
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'seen', 'fixed', 'wont_fix')),
  admin_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- RLS aktivieren
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- Tester duerfen eigene Reports erstellen
CREATE POLICY "bug_reports_insert_own" ON bug_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tester duerfen eigene Reports lesen
CREATE POLICY "bug_reports_select_own" ON bug_reports
  FOR SELECT USING (auth.uid() = user_id);

-- Admins duerfen alle Reports lesen
CREATE POLICY "bug_reports_admin_select" ON bug_reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Admins duerfen Reports aktualisieren (status, admin_notes)
CREATE POLICY "bug_reports_admin_update" ON bug_reports
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Index fuer schnelle Abfrage neuer Reports
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status) WHERE status = 'new';
CREATE INDEX IF NOT EXISTS idx_bug_reports_user ON bug_reports(user_id);
