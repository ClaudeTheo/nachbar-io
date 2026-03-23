-- Migration 113: Anonyme Bug-Reports + Rate-Limiting
-- Erlaubt Bug-Reports ohne Login (z.B. auf der Login-Seite)
-- Spam-Schutz: Honeypot (Client), Rate-Limit (Server), Turnstile (vorbereitet)

-- 1. user_id nullable machen (war ON DELETE SET NULL in Mig 053, aber implizit NOT NULL moeglich)
DO $$
BEGIN
  ALTER TABLE bug_reports ALTER COLUMN user_id DROP NOT NULL;
EXCEPTION
  WHEN others THEN NULL; -- Bereits nullable
END $$;

-- 2. Neue Spalten: source + ip_hash
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'authenticated';
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS ip_hash TEXT;

-- Source-Constraint
DO $$
BEGIN
  ALTER TABLE bug_reports ADD CONSTRAINT bug_reports_source_check
    CHECK (source IN ('authenticated', 'anonymous'));
EXCEPTION
  WHEN duplicate_object THEN NULL; -- Constraint existiert bereits
END $$;

-- 3. Rate-Limit Tabelle
CREATE TABLE IF NOT EXISTS bug_report_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_hash TEXT NOT NULL UNIQUE,
  report_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS fuer Rate-Limit Tabelle (wird nur via Service-Key/Admin genutzt)
ALTER TABLE bug_report_rate_limits ENABLE ROW LEVEL SECURITY;

-- Service-Key Policy — API-Route nutzt getAdminSupabase() der RLS bypassed
-- Keine offene Policy noetig
DO $$
BEGIN
  CREATE POLICY "rate_limits_no_direct_access" ON bug_report_rate_limits
    FOR ALL USING (false) WITH CHECK (false);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4. Insert-Policy fuer anonyme Bug-Reports aktualisieren
-- Alte Policy nur fuer auth.uid() = user_id
DROP POLICY IF EXISTS "bug_reports_insert_own" ON bug_reports;
CREATE POLICY "bug_reports_insert" ON bug_reports
  FOR INSERT WITH CHECK (
    -- Authentifiziert: user_id = eigene ID
    (auth.uid() IS NOT NULL AND user_id = auth.uid() AND source = 'authenticated')
    OR
    -- Anonym: user_id muss NULL sein, source muss 'anonymous' sein
    (user_id IS NULL AND source = 'anonymous')
  );

-- 5. Indizes fuer Admin-Filterung
CREATE INDEX IF NOT EXISTS idx_bug_reports_source ON bug_reports(source);
CREATE INDEX IF NOT EXISTS idx_bug_reports_ip_hash ON bug_reports(ip_hash) WHERE ip_hash IS NOT NULL;
