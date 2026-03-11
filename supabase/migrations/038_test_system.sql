-- Migration 038: Test-System fuer Pilot-QA
-- Erstellt Tabellen fuer strukturierte Testdurchlaeufe mit ~30-40 Testern

-- ============================================================
-- 1. users-Tabelle erweitern
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_tester BOOLEAN DEFAULT true;

-- Pilotphase: Alle bestehenden Nutzer als Tester markieren
UPDATE users SET is_tester = true WHERE is_tester IS NULL OR is_tester = false;

-- ============================================================
-- 2. test_sessions — Ein Eintrag pro Testdurchlauf
-- ============================================================

CREATE TABLE IF NOT EXISTS test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'abandoned')),

  -- Session-Metadaten
  app_version TEXT,
  device_type TEXT,          -- 'mobile' | 'tablet' | 'desktop'
  browser_info TEXT,
  started_from_route TEXT,
  test_run_label TEXT,       -- z.B. "Pilottest Runde 1"

  -- Abschluss-Feedback
  final_feedback TEXT,
  usability_rating SMALLINT CHECK (usability_rating BETWEEN 1 AND 5),
  confidence_rating SMALLINT CHECK (confidence_rating BETWEEN 1 AND 5),

  -- Aggregierte Statistiken (wird beim Abschluss berechnet)
  summary JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. test_results — Ein Eintrag pro Testpunkt pro Session
-- ============================================================

CREATE TABLE IF NOT EXISTS test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
  test_point_id TEXT NOT NULL,  -- z.B. "A1", "G5", "M3"

  -- Ergebnis
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'passed', 'partial', 'failed', 'skipped')),

  -- Fehlerdetails (optional, bei failed/partial)
  comment TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  issue_type TEXT CHECK (issue_type IN ('ui', 'ux', 'functional', 'performance', 'security', 'text', 'accessibility')),
  screenshot_url TEXT,

  -- Zeitmessung
  duration_seconds INTEGER,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ein Testpunkt pro Session nur einmal
  UNIQUE(session_id, test_point_id)
);

-- ============================================================
-- 4. Indizes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_test_sessions_user ON test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_status ON test_sessions(status);
CREATE INDEX IF NOT EXISTS idx_test_results_session ON test_results(session_id);
CREATE INDEX IF NOT EXISTS idx_test_results_status ON test_results(status);
CREATE INDEX IF NOT EXISTS idx_test_results_point ON test_results(test_point_id);
CREATE INDEX IF NOT EXISTS idx_users_is_tester ON users(is_tester) WHERE is_tester = true;

-- ============================================================
-- 5. RLS Policies
-- ============================================================

ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

-- test_sessions: Tester liest eigene Sessions
CREATE POLICY "tester_select_own_sessions" ON test_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- test_sessions: Tester erstellt eigene Sessions
CREATE POLICY "tester_insert_own_sessions" ON test_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- test_sessions: Tester aktualisiert eigene Sessions
CREATE POLICY "tester_update_own_sessions" ON test_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- test_sessions: Admin liest alle Sessions
CREATE POLICY "admin_select_all_sessions" ON test_sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- test_results: Tester liest eigene Ergebnisse
CREATE POLICY "tester_select_own_results" ON test_results
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM test_sessions WHERE id = session_id AND user_id = auth.uid())
  );

-- test_results: Tester erstellt Ergebnisse fuer eigene Session
CREATE POLICY "tester_insert_own_results" ON test_results
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM test_sessions WHERE id = session_id AND user_id = auth.uid())
  );

-- test_results: Tester aktualisiert eigene Ergebnisse
CREATE POLICY "tester_update_own_results" ON test_results
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM test_sessions WHERE id = session_id AND user_id = auth.uid())
  );

-- test_results: Admin liest alle Ergebnisse
CREATE POLICY "admin_select_all_results" ON test_results
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );
