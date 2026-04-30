-- Migration 108: Art. 9 Einwilligungsmanagement (DSFA M12)

-- Aktueller Consent-Stand pro User + Feature
CREATE TABLE care_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL CHECK (feature IN ('sos', 'checkin', 'medications', 'care_profile', 'emergency_contacts')),
  granted BOOLEAN NOT NULL DEFAULT false,
  consent_version TEXT NOT NULL DEFAULT '1.0',
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_care_consents_user_feature ON care_consents(user_id, feature);

-- Historisierung (Art. 7 Abs. 1 Nachweispflicht)
CREATE TABLE care_consent_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_id UUID NOT NULL REFERENCES care_consents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('granted', 'revoked')),
  consent_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_care_consent_history_user ON care_consent_history(user_id);

-- RLS
ALTER TABLE care_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_consent_history ENABLE ROW LEVEL SECURITY;

-- Eigene Consents: Vollzugriff
CREATE POLICY "care_consents_own" ON care_consents
  FOR ALL USING (auth.uid() = user_id);

-- History: Nur lesen + einfuegen (eigene)
CREATE POLICY "care_consent_history_own_read" ON care_consent_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "care_consent_history_own_insert" ON care_consent_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin-Lesezugriff (Audit)
CREATE POLICY "care_consents_admin_read" ON care_consents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "care_consent_history_admin_read" ON care_consent_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================
-- Combined from 108_passkey_credentials.sql to keep migration versions unique locally.
-- ============================================================

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
