-- ============================================================
-- Fix: Sicherheitskritische RLS Policies aus Migration 002
-- Problem: WITH CHECK (true) und USING (true) erlauben
--          unbeschraenkten Zugriff auf households, users, household_members
-- ============================================================

-- 1. Households: Nur authentifizierte Nutzer duerfen lesen
DROP POLICY IF EXISTS "households_invite_check" ON households;
CREATE POLICY "households_invite_check" ON households
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- 2. Users: Nur eigenes Profil erstellen (auth.uid() = id)
DROP POLICY IF EXISTS "users_insert" ON users;
CREATE POLICY "users_insert" ON users
    FOR INSERT
    WITH CHECK (id = auth.uid());

-- 3. Household Members: Nur eigene Mitgliedschaft erstellen
DROP POLICY IF EXISTS "hm_insert" ON household_members;
CREATE POLICY "hm_insert" ON household_members
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Trigger: Sicherheitsfelder serverseitig erzwingen
-- Client kann trust_level, is_admin, verified_at nicht manipulieren
-- ============================================================

-- Trigger-Funktion fuer Users: trust_level und is_admin erzwingen
CREATE OR REPLACE FUNCTION enforce_user_defaults()
RETURNS TRIGGER AS $$
BEGIN
    -- Neue Nutzer starten immer als 'new', nie als 'verified' oder 'admin'
    NEW.trust_level := 'new';
    NEW.is_admin := false;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger nur bei INSERT (nicht UPDATE — Admin soll trust_level aendern koennen)
DROP TRIGGER IF EXISTS trigger_enforce_user_defaults ON users;
CREATE TRIGGER trigger_enforce_user_defaults
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION enforce_user_defaults();

-- Trigger-Funktion fuer Household Members: verified_at und role erzwingen
CREATE OR REPLACE FUNCTION enforce_member_defaults()
RETURNS TRIGGER AS $$
BEGIN
    -- Neue Mitglieder werden automatisch verifiziert (Invite-Code war Beweis)
    NEW.verified_at := NOW();
    -- Rolle ist immer 'member' bei Registrierung
    NEW.role := 'member';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_enforce_member_defaults ON household_members;
CREATE TRIGGER trigger_enforce_member_defaults
    BEFORE INSERT ON household_members
    FOR EACH ROW
    EXECUTE FUNCTION enforce_member_defaults();
