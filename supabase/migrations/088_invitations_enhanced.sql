-- Migration 088: Erweitertes Einladungssystem
-- Erweitert neighbor_invitations um SMS-Kanal, Empfaengername, Conversion-Tracking

-- Neue Spalten hinzufuegen
ALTER TABLE neighbor_invitations
  ADD COLUMN IF NOT EXISTS recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS recipient_phone TEXT,
  ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES quarters(id),
  ADD COLUMN IF NOT EXISTS converted_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '30 days',
  ADD COLUMN IF NOT EXISTS sms_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_sid TEXT;

-- invite_method um 'sms' erweitern
ALTER TABLE neighbor_invitations
  DROP CONSTRAINT IF EXISTS neighbor_invitations_invite_method_check;

ALTER TABLE neighbor_invitations
  ADD CONSTRAINT neighbor_invitations_invite_method_check
  CHECK (invite_method IN ('email', 'whatsapp', 'code', 'sms'));

-- status um 'converted' erweitern
ALTER TABLE neighbor_invitations
  DROP CONSTRAINT IF EXISTS neighbor_invitations_status_check;

ALTER TABLE neighbor_invitations
  ADD CONSTRAINT neighbor_invitations_status_check
  CHECK (status IN ('sent', 'accepted', 'expired', 'converted'));

-- Index fuer Conversion-Lookup
CREATE INDEX IF NOT EXISTS idx_neighbor_invitations_converted
  ON neighbor_invitations(converted_user_id) WHERE converted_user_id IS NOT NULL;

-- Index fuer Quarter-basierte Abfragen
CREATE INDEX IF NOT EXISTS idx_neighbor_invitations_quarter
  ON neighbor_invitations(quarter_id);
