-- Migration 108: Passkey/WebAuthn Credentials
-- Design: docs/plans/2026-03-23-passkey-design.md

CREATE TABLE passkey_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  device_name TEXT NOT NULL DEFAULT 'Unbekanntes Geraet',
  transports TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_passkey_credentials_user_id ON passkey_credentials(user_id);
CREATE INDEX idx_passkey_credentials_credential_id ON passkey_credentials(credential_id);

ALTER TABLE passkey_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "passkey_select_own" ON passkey_credentials
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "passkey_insert_own" ON passkey_credentials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "passkey_delete_own" ON passkey_credentials
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "passkey_update_service" ON passkey_credentials
  FOR UPDATE USING (true)
  WITH CHECK (true);

ALTER TABLE users ADD COLUMN IF NOT EXISTS passkey_secret TEXT;
