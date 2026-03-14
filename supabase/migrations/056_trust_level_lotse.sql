-- Migration 056: Trust-Level um 'lotse' erweitern + quarter_lotsen Tabelle
-- Phase 2 des Strategie-Umsetzungsplans

-- 1) Trust-Level CHECK-Constraint erweitern um 'lotse'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_trust_level_check;
ALTER TABLE users ADD CONSTRAINT users_trust_level_check
  CHECK (trust_level IN ('new', 'verified', 'trusted', 'lotse', 'admin'));

-- 2) Lotse-Felder auf quarters
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS max_lotsen INTEGER DEFAULT 3;

-- 3) Lotsen-Tabelle (Wahl + Ernennung)
CREATE TABLE IF NOT EXISTS quarter_lotsen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter_id UUID NOT NULL REFERENCES quarters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  appointed_at TIMESTAMPTZ DEFAULT NOW(),
  appointed_by UUID REFERENCES users(id),  -- NULL = Community-Wahl
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  UNIQUE(quarter_id, user_id)
);

-- 4) RLS: Lotsen sehen eigene + Admins sehen alle
ALTER TABLE quarter_lotsen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lotsen_read" ON quarter_lotsen FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_super_admin()
    OR is_quarter_admin_for(quarter_id)
  );

CREATE POLICY "lotsen_manage" ON quarter_lotsen FOR ALL
  USING (
    is_super_admin()
    OR is_quarter_admin_for(quarter_id)
  );

-- 5) Hilfsfunktion: Ist Nutzer Lotse im Quartier?
CREATE OR REPLACE FUNCTION is_lotse_for(p_quarter_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM quarter_lotsen
    WHERE quarter_id = p_quarter_id
    AND user_id = auth.uid()
    AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 6) Vouching-Tabelle: 2 Nachbarn bestaetigen Identitaet
CREATE TABLE IF NOT EXISTS neighbor_vouches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quarter_id UUID NOT NULL REFERENCES quarters(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(voucher_id, target_id)
);

ALTER TABLE neighbor_vouches ENABLE ROW LEVEL SECURITY;

-- Verifizierte Nutzer koennen vouchen
CREATE POLICY "vouches_insert" ON neighbor_vouches FOR INSERT
  WITH CHECK (
    voucher_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
      AND trust_level IN ('verified', 'trusted', 'lotse', 'admin')
    )
  );

-- Eigene Vouches und Admins koennen lesen
CREATE POLICY "vouches_read" ON neighbor_vouches FOR SELECT
  USING (
    voucher_id = auth.uid()
    OR target_id = auth.uid()
    OR is_super_admin()
  );
