-- Migration 145: Security Forensics — Verschluesselte Incident-Daten
-- Strikt getrennt von security_events (Audit-Log)
-- Rechtsgrundlage: Art. 6 Abs. 1f DSGVO (berechtigtes Interesse an IT-Sicherheit)
-- Retention: 7 Tage automatische Loeschung
-- Zugriff: NUR service_role (kein User-Zugriff, auch nicht Admins)

CREATE TABLE IF NOT EXISTS security_forensics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_id UUID REFERENCES security_events(id),

  -- Verschluesselte Felder (AES-256-GCM, gleicher Key wie Care-Daten)
  ip_encrypted TEXT NOT NULL,
  user_agent_encrypted TEXT,
  request_url_encrypted TEXT,

  -- Nicht-personenbezogene Metadaten (Klartext)
  request_method TEXT NOT NULL DEFAULT 'GET',
  response_status INTEGER,
  trap_type TEXT NOT NULL,

  -- Automatische Loeschung nach 7 Tagen
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

-- Index fuer Event-Korrelation
CREATE INDEX idx_sec_forensics_event ON security_forensics(event_id);

-- Index fuer zeitbasierte Abfragen
CREATE INDEX idx_sec_forensics_created ON security_forensics(created_at DESC);

-- Index fuer automatische Bereinigung (Cron-Job prueft expires_at)
CREATE INDEX idx_sec_forensics_expires ON security_forensics(expires_at);

-- RLS: Maximale Restriktion
ALTER TABLE security_forensics ENABLE ROW LEVEL SECURITY;

-- KEIN SELECT/INSERT/UPDATE/DELETE Policy = nur service_role hat Zugriff
-- Das ist Absicht: Forensik-Daten sind hochsensibel.
-- Zugriff NUR ueber Admin-Supabase-Client mit service_role Key.
