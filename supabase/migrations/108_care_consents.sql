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
