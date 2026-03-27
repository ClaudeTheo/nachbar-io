-- Migration 116: Nachbar Hilfe Phase 2
-- Helfer-Verbindungen, Subscription-Felder, Sammelabrechnungen

-- 1. Helfer-Verbindungen (doppelte Bestaetigung, DSGVO Art. 6 Abs. 1a)
CREATE TABLE IF NOT EXISTS helper_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  helper_id UUID REFERENCES neighborhood_helpers NOT NULL,
  resident_id UUID REFERENCES auth.users NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('organic', 'invitation')),
  invite_code TEXT,
  confirmed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(helper_id, resident_id)
);

ALTER TABLE helper_connections ENABLE ROW LEVEL SECURITY;

-- Helfer sieht eigene Verbindungen
CREATE POLICY "connections_helper" ON helper_connections FOR ALL TO authenticated USING (
  helper_id IN (SELECT id FROM neighborhood_helpers WHERE user_id = auth.uid())
);

-- Senior sieht eigene Verbindungen
CREATE POLICY "connections_resident" ON helper_connections FOR ALL TO authenticated USING (
  resident_id = auth.uid()
);

CREATE INDEX idx_helper_connections_helper ON helper_connections(helper_id);
CREATE INDEX idx_helper_connections_resident ON helper_connections(resident_id);
CREATE INDEX idx_helper_connections_invite_code ON helper_connections(invite_code) WHERE invite_code IS NOT NULL;

-- 2. Subscription-Felder auf neighborhood_helpers
ALTER TABLE neighborhood_helpers ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free'
  CHECK (subscription_status IN ('free', 'trial', 'active', 'paused', 'cancelled'));
ALTER TABLE neighborhood_helpers ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE neighborhood_helpers ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE neighborhood_helpers ADD COLUMN IF NOT EXISTS trial_receipt_used BOOLEAN DEFAULT false;
ALTER TABLE neighborhood_helpers ADD COLUMN IF NOT EXISTS subscription_paused_at TIMESTAMPTZ;
ALTER TABLE neighborhood_helpers ADD COLUMN IF NOT EXISTS subscription_cancelled_at TIMESTAMPTZ;

-- Alle bestehenden Helfer starten im Trial-Status
UPDATE neighborhood_helpers SET subscription_status = 'trial' WHERE subscription_status IS NULL OR subscription_status = 'free';

-- 3. Sammelabrechnungen
CREATE TABLE IF NOT EXISTS help_monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  helper_id UUID REFERENCES neighborhood_helpers NOT NULL,
  resident_id UUID REFERENCES auth.users NOT NULL,
  month_year TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  total_sessions INT NOT NULL,
  total_amount_cents INT NOT NULL,
  sent_to_email TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(helper_id, resident_id, month_year)
);

ALTER TABLE help_monthly_reports ENABLE ROW LEVEL SECURITY;

-- Helfer sieht eigene Reports
CREATE POLICY "reports_helper" ON help_monthly_reports FOR ALL TO authenticated USING (
  helper_id IN (SELECT id FROM neighborhood_helpers WHERE user_id = auth.uid())
);

-- Senior sieht eigene Reports
CREATE POLICY "reports_resident" ON help_monthly_reports FOR ALL TO authenticated USING (
  resident_id = auth.uid()
);

CREATE INDEX idx_monthly_reports_helper_month ON help_monthly_reports(helper_id, month_year);
CREATE INDEX idx_monthly_reports_resident ON help_monthly_reports(resident_id);
