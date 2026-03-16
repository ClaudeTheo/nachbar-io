-- Migration 067: Arzt-Registrierung, Consent-Tracking, Webhook-Events
-- Design: docs/plans/2026-03-15-arzt-portal-registration-design.md
-- Ausgefuehrt via Supabase MCP am 2026-03-15

-- 1. Neue Felder auf users-Tabelle
ALTER TABLE users ADD COLUMN IF NOT EXISTS praxis_website TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS praxis_address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- 2. Consent-Versionen (Klartext + Hash fuer Pruefer)
CREATE TABLE IF NOT EXISTS consent_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('dsgvo', 'avv', 'marketing')),
  text_de TEXT NOT NULL,
  text_hash TEXT NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE consent_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consent_versions_read" ON consent_versions
  FOR SELECT USING (true);

-- 3. Doctor Consents (rechtssicherer Nachweis)
CREATE TABLE IF NOT EXISTS doctor_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('dsgvo', 'avv', 'marketing')),
  consent_version_id UUID REFERENCES consent_versions(id),
  consent_text_hash TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  ip_address_hash TEXT,
  magic_link_verified_at TIMESTAMPTZ,
  UNIQUE(user_id, consent_type, granted_at)
);

ALTER TABLE doctor_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doctor_own_consents" ON doctor_consents
  FOR ALL USING (auth.uid() = user_id);

-- 4. Webhook-Events fuer n8n
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  delivery_attempts INT DEFAULT 0,
  next_retry_at TIMESTAMPTZ
);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_webhook_pending
  ON webhook_events(next_retry_at)
  WHERE delivered_at IS NULL;

-- 5. Performance-Index fuer LANR-Duplikat-Check
CREATE INDEX IF NOT EXISTS idx_users_lanr_active
  ON users(lanr)
  WHERE deleted_at IS NULL AND lanr IS NOT NULL;

-- 6. Initiale Consent-Versionen
INSERT INTO consent_versions (version, consent_type, text_de, text_hash) VALUES
  ('v1.0.0', 'dsgvo',
   'Ich willige in die Verarbeitung meiner Daten gemaess der Datenschutzerklaerung ein. Ich bestaetige, dass ich approbierter Arzt bin und die angegebene LANR/BSNR korrekt ist.',
   encode(sha256(convert_to('Ich willige in die Verarbeitung meiner Daten gemaess der Datenschutzerklaerung ein. Ich bestaetige, dass ich approbierter Arzt bin und die angegebene LANR/BSNR korrekt ist.', 'UTF8')), 'hex')
  ),
  ('v1.0.0-avv', 'avv',
   'Ich nehme die Auftragsverarbeitungsvereinbarung (AVV) zur Kenntnis und stimme der Verarbeitung von Patientendaten ueber die Plattform zu.',
   encode(sha256(convert_to('Ich nehme die Auftragsverarbeitungsvereinbarung (AVV) zur Kenntnis und stimme der Verarbeitung von Patientendaten ueber die Plattform zu.', 'UTF8')), 'hex')
  ),
  ('v1.0.0-marketing', 'marketing',
   'Ich moechte ueber neue Funktionen und Updates per E-Mail informiert werden.',
   encode(sha256(convert_to('Ich moechte ueber neue Funktionen und Updates per E-Mail informiert werden.', 'UTF8')), 'hex')
  );

-- 7. Atomare Registrierung via RPC
CREATE OR REPLACE FUNCTION register_doctor(
  p_user_id UUID,
  p_full_name TEXT,
  p_lanr TEXT,
  p_bsnr TEXT,
  p_praxis_name TEXT,
  p_praxis_address TEXT,
  p_fachrichtung TEXT,
  p_praxis_website TEXT DEFAULT NULL,
  p_consent_dsgvo_version_id UUID DEFAULT NULL,
  p_consent_avv_version_id UUID DEFAULT NULL,
  p_consent_marketing_version_id UUID DEFAULT NULL,
  p_ip_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  INSERT INTO users (
    id, full_name, role, lanr, bsnr,
    praxis_name, praxis_address, fachrichtung, praxis_website,
    doctor_verification_status, created_at
  ) VALUES (
    p_user_id, p_full_name, 'doctor', p_lanr, p_bsnr,
    p_praxis_name, p_praxis_address, p_fachrichtung, p_praxis_website,
    'pending', now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    lanr = EXCLUDED.lanr,
    bsnr = EXCLUDED.bsnr,
    praxis_name = EXCLUDED.praxis_name,
    praxis_address = EXCLUDED.praxis_address,
    fachrichtung = EXCLUDED.fachrichtung,
    praxis_website = EXCLUDED.praxis_website
  WHERE users.doctor_verification_status = 'pending';

  IF p_consent_dsgvo_version_id IS NOT NULL THEN
    INSERT INTO doctor_consents (
      user_id, consent_type, consent_version_id,
      consent_text_hash, ip_address_hash, granted_at
    )
    SELECT p_user_id, 'dsgvo', p_consent_dsgvo_version_id,
           cv.text_hash, p_ip_hash, now()
    FROM consent_versions cv WHERE cv.id = p_consent_dsgvo_version_id
    ON CONFLICT (user_id, consent_type, granted_at) DO NOTHING;
  END IF;

  IF p_consent_avv_version_id IS NOT NULL THEN
    INSERT INTO doctor_consents (
      user_id, consent_type, consent_version_id,
      consent_text_hash, ip_address_hash, granted_at
    )
    SELECT p_user_id, 'avv', p_consent_avv_version_id,
           cv.text_hash, p_ip_hash, now()
    FROM consent_versions cv WHERE cv.id = p_consent_avv_version_id
    ON CONFLICT (user_id, consent_type, granted_at) DO NOTHING;
  END IF;

  IF p_consent_marketing_version_id IS NOT NULL THEN
    INSERT INTO doctor_consents (
      user_id, consent_type, consent_version_id,
      consent_text_hash, ip_address_hash, granted_at
    )
    SELECT p_user_id, 'marketing', p_consent_marketing_version_id,
           cv.text_hash, p_ip_hash, now()
    FROM consent_versions cv WHERE cv.id = p_consent_marketing_version_id
    ON CONFLICT (user_id, consent_type, granted_at) DO NOTHING;
  END IF;

  INSERT INTO webhook_events (event_type, payload)
  VALUES ('doctor.registered', jsonb_build_object(
    'user_id', p_user_id,
    'lanr', p_lanr,
    'bsnr', p_bsnr,
    'full_name', p_full_name,
    'praxis_name', p_praxis_name
  ));

  v_result := jsonb_build_object('success', true, 'user_id', p_user_id);
  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;
