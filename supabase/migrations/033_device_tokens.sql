-- 033_device_tokens.sql
-- Geräte-Token für reTerminal E1001 Companion-Geräte

CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  device_name TEXT NOT NULL DEFAULT 'reTerminal E1001',
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS aktivieren
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Index für Token-Lookup
CREATE INDEX idx_device_tokens_token ON device_tokens(token);

COMMENT ON TABLE device_tokens IS 'Authentifizierungs-Tokens für physische Companion-Geräte (reTerminal E1001)';
