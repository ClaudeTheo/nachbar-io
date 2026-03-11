-- Migration 036: Onboarding-Overhaul
-- Neue Tabellen: verification_requests, neighbor_invitations, reputation_points
-- Aenderungen: household_members.verification_method

-- ============================================================
-- 1. household_members: verification_method Spalte hinzufuegen
-- ============================================================
ALTER TABLE household_members
  ADD COLUMN IF NOT EXISTS verification_method TEXT DEFAULT 'invite_code';

-- Bestehende Mitglieder als invite_code markieren
UPDATE household_members SET verification_method = 'invite_code' WHERE verification_method IS NULL;

-- ============================================================
-- 2. verification_requests Tabelle
-- ============================================================
CREATE TABLE IF NOT EXISTS verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  method TEXT NOT NULL DEFAULT 'address_manual',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Index fuer ausstehende Anfragen
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_user ON verification_requests(user_id);

-- RLS
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

-- Nutzer koennen eigene Anfragen sehen
CREATE POLICY "verification_requests_own_read" ON verification_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Nutzer koennen neue Anfragen erstellen
CREATE POLICY "verification_requests_own_insert" ON verification_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins koennen alle sehen und bearbeiten
CREATE POLICY "verification_requests_admin_read" ON verification_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "verification_requests_admin_update" ON verification_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================
-- 3. neighbor_invitations Tabelle
-- ============================================================
CREATE TABLE IF NOT EXISTS neighbor_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  invite_method TEXT NOT NULL CHECK (invite_method IN ('email', 'whatsapp', 'code')),
  invite_target TEXT,
  invite_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'accepted', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id)
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_neighbor_invitations_inviter ON neighbor_invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_neighbor_invitations_code ON neighbor_invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_neighbor_invitations_status ON neighbor_invitations(status);

-- RLS
ALTER TABLE neighbor_invitations ENABLE ROW LEVEL SECURITY;

-- Einladender kann eigene Einladungen sehen
CREATE POLICY "neighbor_invitations_own_read" ON neighbor_invitations
  FOR SELECT USING (auth.uid() = inviter_id);

-- Verifizierte Nutzer koennen Einladungen erstellen
CREATE POLICY "neighbor_invitations_verified_insert" ON neighbor_invitations
  FOR INSERT WITH CHECK (
    auth.uid() = inviter_id
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
      AND trust_level IN ('verified', 'trusted', 'admin')
    )
  );

-- Einladungen koennen aktualisiert werden (Annahme)
CREATE POLICY "neighbor_invitations_update" ON neighbor_invitations
  FOR UPDATE USING (true);

-- Admins koennen alle sehen
CREATE POLICY "neighbor_invitations_admin_read" ON neighbor_invitations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================
-- 4. reputation_points Tabelle
-- ============================================================
CREATE TABLE IF NOT EXISTS reputation_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index fuer Punkte-Abfragen
CREATE INDEX IF NOT EXISTS idx_reputation_points_user ON reputation_points(user_id);

-- RLS
ALTER TABLE reputation_points ENABLE ROW LEVEL SECURITY;

-- Nutzer koennen eigene Punkte sehen
CREATE POLICY "reputation_points_own_read" ON reputation_points
  FOR SELECT USING (auth.uid() = user_id);

-- System kann Punkte einfuegen (via Service-Role oder Policy)
CREATE POLICY "reputation_points_insert" ON reputation_points
  FOR INSERT WITH CHECK (true);

-- Admins koennen alle Punkte sehen
CREATE POLICY "reputation_points_admin_read" ON reputation_points
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );
