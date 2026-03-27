-- Migration 115: Nachbar Hilfe — Nachbarschaftshilfe-Modul

-- 1. Bundesland-Regeln (Referenzdaten)
CREATE TABLE IF NOT EXISTS federal_state_rules (
  state_code TEXT PRIMARY KEY,
  state_name TEXT NOT NULL,
  is_available BOOLEAN DEFAULT true,
  training_required BOOLEAN DEFAULT false,
  training_hours INT,
  min_age INT DEFAULT 16,
  max_hourly_rate_cents INT,
  max_concurrent_clients INT,
  relationship_exclusion_degree INT DEFAULT 2,
  same_household_excluded BOOLEAN DEFAULT true,
  registration_authority TEXT,
  official_form_url TEXT,
  notes TEXT
);

INSERT INTO federal_state_rules (state_code, state_name, is_available, training_required, training_hours, min_age, max_hourly_rate_cents, max_concurrent_clients, notes) VALUES
  ('BW', 'Baden-Wuerttemberg', true, false, NULL, 16, NULL, 2, 'Seit 01.01.2025: vereinfachte Einzelhelfenden-Abrechnung'),
  ('BY', 'Bayern', true, false, NULL, 16, NULL, NULL, 'Nachbarschaftshilfe nach Art. 45a SGB XI anerkannt'),
  ('NW', 'Nordrhein-Westfalen', true, true, 30, 16, NULL, NULL, 'Pflegekurs oder 30h Schulung erforderlich'),
  ('HB', 'Bremen', false, false, NULL, 16, NULL, NULL, 'Nachbarschaftshilfe nicht ueber Entlastungsbetrag abrechenbar')
ON CONFLICT (state_code) DO NOTHING;

ALTER TABLE federal_state_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "federal_state_rules_select" ON federal_state_rules FOR SELECT TO authenticated USING (true);

-- 2. Pflege-Profil
CREATE TABLE IF NOT EXISTS care_profiles_hilfe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  care_level INT CHECK (care_level BETWEEN 1 AND 5),
  insurance_name TEXT NOT NULL,
  insurance_number_encrypted TEXT NOT NULL,
  monthly_budget_cents INT DEFAULT 13100,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE care_profiles_hilfe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "care_profiles_hilfe_own" ON care_profiles_hilfe FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Helfer-Profile
CREATE TABLE IF NOT EXISTS neighborhood_helpers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  federal_state TEXT REFERENCES federal_state_rules(state_code) NOT NULL,
  date_of_birth DATE NOT NULL,
  hourly_rate_cents INT NOT NULL,
  certification_url TEXT,
  verified BOOLEAN DEFAULT false,
  relationship_check BOOLEAN NOT NULL DEFAULT false,
  household_check BOOLEAN NOT NULL DEFAULT false,
  terms_accepted_at TIMESTAMPTZ,
  active_client_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE neighborhood_helpers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "helpers_own" ON neighborhood_helpers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "helpers_quarter_read" ON neighborhood_helpers FOR SELECT TO authenticated USING (verified = true);

-- 4. Hilfe-Gesuche
CREATE TABLE IF NOT EXISTS help_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  quarter_id UUID NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('einkaufen','begleitung','haushalt','garten','technik','vorlesen','sonstiges')),
  description TEXT,
  preferred_time TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','matched','completed','cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "requests_own" ON help_requests FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "requests_open_read" ON help_requests FOR SELECT TO authenticated USING (status = 'open');

-- 5. Vermittlungen
CREATE TABLE IF NOT EXISTS help_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES help_requests NOT NULL,
  helper_id UUID REFERENCES neighborhood_helpers NOT NULL,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE help_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches_parties" ON help_matches FOR ALL TO authenticated USING (
  helper_id IN (SELECT id FROM neighborhood_helpers WHERE user_id = auth.uid())
  OR request_id IN (SELECT id FROM help_requests WHERE user_id = auth.uid())
);

-- 6. Einsatz-Dokumentation
CREATE TABLE IF NOT EXISTS help_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES help_matches NOT NULL,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INT NOT NULL,
  activity_category TEXT NOT NULL,
  activity_description TEXT,
  hourly_rate_cents INT NOT NULL,
  total_amount_cents INT NOT NULL,
  helper_signature_url TEXT,
  resident_signature_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','signed','receipt_created')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE help_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_parties" ON help_sessions FOR ALL TO authenticated USING (
  match_id IN (
    SELECT hm.id FROM help_matches hm
    JOIN neighborhood_helpers nh ON hm.helper_id = nh.id
    WHERE nh.user_id = auth.uid()
    UNION
    SELECT hm.id FROM help_matches hm
    JOIN help_requests hr ON hm.request_id = hr.id
    WHERE hr.user_id = auth.uid()
  )
);

-- 7. PDF-Quittungen
CREATE TABLE IF NOT EXISTS help_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES help_sessions NOT NULL,
  pdf_url TEXT NOT NULL,
  submitted_to_insurer BOOLEAN DEFAULT false,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE help_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receipts_parties" ON help_receipts FOR ALL TO authenticated USING (
  session_id IN (
    SELECT hs.id FROM help_sessions hs
    JOIN help_matches hm ON hs.match_id = hm.id
    JOIN neighborhood_helpers nh ON hm.helper_id = nh.id
    WHERE nh.user_id = auth.uid()
    UNION
    SELECT hs.id FROM help_sessions hs
    JOIN help_matches hm ON hs.match_id = hm.id
    JOIN help_requests hr ON hm.request_id = hr.id
    WHERE hr.user_id = auth.uid()
  )
);

-- Indizes
CREATE INDEX idx_help_requests_quarter_status ON help_requests(quarter_id, status);
CREATE INDEX idx_help_requests_user ON help_requests(user_id);
CREATE INDEX idx_help_matches_request ON help_matches(request_id);
CREATE INDEX idx_help_matches_helper ON help_matches(helper_id);
CREATE INDEX idx_help_sessions_match ON help_sessions(match_id);
CREATE INDEX idx_help_receipts_session ON help_receipts(session_id);
CREATE INDEX idx_neighborhood_helpers_state ON neighborhood_helpers(federal_state);
CREATE INDEX idx_care_profiles_hilfe_user ON care_profiles_hilfe(user_id);
