-- Migration 045: Automatisches Seiten-Tracking fuer Tester
-- Neue Spalte visited_routes in test_sessions: JSONB-Array mit besuchten Routen
-- Format: [{"route": "/dashboard", "first_visit": "2026-03-12T10:00:00Z", "visit_count": 5}]

ALTER TABLE test_sessions
ADD COLUMN IF NOT EXISTS visited_routes JSONB DEFAULT '[]'::jsonb;

-- Index fuer performante Abfragen
CREATE INDEX IF NOT EXISTS idx_test_sessions_visited_routes
ON test_sessions USING gin (visited_routes);
