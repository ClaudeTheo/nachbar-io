-- Migration 110: Mitess-Plaetze (shared_meals + meal_signups)
-- Zwei Modi: Portionen (schnell abholen) + Einladungen (geplant, gemeinsam)

CREATE TABLE shared_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  quarter_id UUID REFERENCES quarters(id),
  type TEXT NOT NULL CHECK (type IN ('portion', 'invitation')),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  servings INTEGER NOT NULL CHECK (servings > 0),
  cost_hint TEXT,
  pickup_info TEXT,
  meal_date DATE NOT NULL,
  meal_time TIME,
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'full', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE meal_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES shared_meals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  portions INTEGER DEFAULT 1 CHECK (portions > 0),
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(meal_id, user_id)
);

-- Indizes
CREATE INDEX idx_shared_meals_quarter ON shared_meals(quarter_id);
CREATE INDEX idx_shared_meals_status_date ON shared_meals(status, meal_date);
CREATE INDEX idx_shared_meals_user ON shared_meals(user_id);
CREATE INDEX idx_meal_signups_meal ON meal_signups(meal_id);
CREATE INDEX idx_meal_signups_user ON meal_signups(user_id);

-- RLS aktivieren
ALTER TABLE shared_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_signups ENABLE ROW LEVEL SECURITY;

-- shared_meals: Lesen fuer alle verifizierten Mitglieder
CREATE POLICY "shared_meals_select" ON shared_meals FOR SELECT
  USING (is_verified_member());

-- shared_meals: Erstellen fuer authentifizierte User
CREATE POLICY "shared_meals_insert" ON shared_meals FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_verified_member());

-- shared_meals: Aendern/Loeschen nur eigene
CREATE POLICY "shared_meals_update" ON shared_meals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "shared_meals_delete" ON shared_meals FOR DELETE
  USING (auth.uid() = user_id);

-- meal_signups: Lesen fuer alle verifizierten Mitglieder
CREATE POLICY "meal_signups_select" ON meal_signups FOR SELECT
  USING (is_verified_member());

-- meal_signups: Anmelden fuer verifizierte User
CREATE POLICY "meal_signups_insert" ON meal_signups FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_verified_member());

-- meal_signups: Nur eigene Anmeldung aendern/loeschen
CREATE POLICY "meal_signups_update" ON meal_signups FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "meal_signups_delete" ON meal_signups FOR DELETE
  USING (auth.uid() = user_id);
