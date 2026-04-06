-- Migration 144: Security Events — Audit-Log fuer Trap-System
-- Design: docs/plans/2026-04-06-security-trap-system-design.md

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_hash TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id),
  session_hash TEXT,
  trap_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'high', 'critical')),
  points INTEGER NOT NULL,
  effective_score INTEGER,
  stage INTEGER CHECK (stage BETWEEN 0 AND 4),
  route_pattern TEXT,
  metadata JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES public.users(id),
  resolved_at TIMESTAMPTZ
);

-- Indizes
CREATE INDEX idx_sec_events_created ON security_events(created_at DESC);
CREATE INDEX idx_sec_events_severity ON security_events(severity)
  WHERE severity IN ('high', 'critical');
CREATE INDEX idx_sec_events_ip ON security_events(ip_hash, created_at DESC);
CREATE INDEX idx_sec_events_unresolved ON security_events(resolved, created_at DESC)
  WHERE resolved = false;

-- RLS: Audit-sicher
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Kein INSERT-Policy = nur service_role kann schreiben

-- SELECT: Nur org_admins
CREATE POLICY sec_events_admin_read ON security_events FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM org_members WHERE role = 'admin'
  ));

-- UPDATE: Nur resolved-Felder durch Admins
CREATE POLICY sec_events_admin_resolve ON security_events FOR UPDATE
  USING (auth.uid() IN (
    SELECT user_id FROM org_members WHERE role = 'admin'
  ))
  WITH CHECK (resolved IS NOT NULL);

-- Kein DELETE — Audit-Trail ist unveraenderlich
