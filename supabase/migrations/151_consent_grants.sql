-- Migration 151: consent_grants Minimalversion (Phase 1 / G2)
-- Zweck: Formaler Nachweis WANN WER WOFUER Zugriff auf Bewohnerdaten erhalten hat
-- Scope: 8 Spalten, parallel zu caregiver_links (kein Breaking Change)

CREATE TABLE consent_grants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grantee_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  grantee_org_id  UUID REFERENCES organizations(id) ON DELETE CASCADE,
  purpose         TEXT NOT NULL,
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at      TIMESTAMPTZ,
  CONSTRAINT consent_grantee_check CHECK (
    grantee_id IS NOT NULL OR grantee_org_id IS NOT NULL
  )
);

-- Indexes
CREATE INDEX idx_consent_subject ON consent_grants(subject_id);
CREATE INDEX idx_consent_grantee ON consent_grants(grantee_id) WHERE grantee_id IS NOT NULL;
CREATE INDEX idx_consent_org ON consent_grants(grantee_org_id) WHERE grantee_org_id IS NOT NULL;
CREATE INDEX idx_consent_active ON consent_grants(subject_id, purpose) WHERE revoked_at IS NULL;

-- RLS
ALTER TABLE consent_grants ENABLE ROW LEVEL SECURITY;

-- Bewohner sieht eigene Consents (alle, auch widerrufene — fuer Transparenz)
CREATE POLICY consent_select_subject ON consent_grants
  FOR SELECT USING (subject_id = auth.uid());

-- Grantee sieht nur eigene AKTIVE Consents
CREATE POLICY consent_select_grantee ON consent_grants
  FOR SELECT USING (
    grantee_id = auth.uid() AND revoked_at IS NULL
  );

-- Org-Mitglieder sehen aktive Org-Consents
CREATE POLICY consent_select_org ON consent_grants
  FOR SELECT USING (
    revoked_at IS NULL
    AND grantee_org_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = consent_grants.grantee_org_id
        AND om.user_id = auth.uid()
    )
  );

-- Nur Bewohner kann Consent erteilen
CREATE POLICY consent_insert_subject ON consent_grants
  FOR INSERT WITH CHECK (subject_id = auth.uid());

-- Nur Bewohner kann Consent widerrufen (revoked_at setzen)
CREATE POLICY consent_update_revoke ON consent_grants
  FOR UPDATE USING (subject_id = auth.uid())
  WITH CHECK (revoked_at IS NOT NULL);

-- Niemand kann Consents loeschen (Nachweis muss erhalten bleiben)
-- Kein DELETE Policy = DELETE fuer authenticated/anon verboten
-- Zusaetzlich explizit entziehen:
REVOKE DELETE ON consent_grants FROM authenticated, anon;
