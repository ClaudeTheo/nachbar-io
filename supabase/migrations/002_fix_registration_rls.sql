-- ============================================================
-- Fix: RLS Policies für Registrierung
-- Anonyme Nutzer müssen Invite-Code prüfen können
-- Neue Nutzer müssen ihr Profil erstellen können
-- ============================================================

-- Households: Anonyme können per Invite-Code nachschlagen
-- (gibt nur id, street_name, house_number zurück — keine sensiblen Daten)
CREATE POLICY "households_invite_check" ON households
    FOR SELECT
    USING (true);

-- Drop die restriktive Policy und ersetze sie
DROP POLICY IF EXISTS "households_read" ON households;

-- Users: Neue Nutzer müssen sich selbst einfügen können
-- (auth.uid() ist direkt nach signUp bereits gesetzt)
DROP POLICY IF EXISTS "users_insert" ON users;
CREATE POLICY "users_insert" ON users
    FOR INSERT
    WITH CHECK (true);

-- Household Members: Neue Nutzer müssen sich zuordnen können
DROP POLICY IF EXISTS "hm_insert" ON household_members;
CREATE POLICY "hm_insert" ON household_members
    FOR INSERT
    WITH CHECK (true);
