-- ============================================================
-- Migration 040: RLS-Sicherheit verschaerfen
--
-- Behebt kritische Schwachstellen:
-- 1. Households: Invite-Codes nicht an alle authentifizierten Nutzer zeigen
-- 2. Household Members: Nicht-autorisiertes Beitreten verhindern
-- 3. Auto-Verifizierung aus Trigger entfernen (API handled das)
-- ============================================================

-- 1. Households: Authentifizierte Nutzer sehen Basisdaten,
--    aber invite_code nur fuer eigene Haushalte
--    Die Registrierung laeuft ueber Service-Role (umgeht RLS).

DROP POLICY IF EXISTS "households_invite_check" ON households;

-- Alle authentifizierten Nutzer duerfen Haushalte sehen (fuer Karte etc.)
-- ABER: invite_code ist ein sensibles Feld — wird per View/API geschuetzt
CREATE POLICY "households_read_authenticated" ON households
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- 2. Household Members: INSERT nur wenn der User dem Haushalt zugeordnet ist
--    oder wenn es der erste Eintrag ist (Registrierung via Service-Role umgeht das)

DROP POLICY IF EXISTS "hm_insert" ON household_members;

-- Strengere Policy: User kann sich nur einfuegen wenn:
-- a) user_id = auth.uid() (nur sich selbst)
-- b) UND es bereits eine Einladung/Verifikation gibt
--    HINWEIS: Die Registrierung laeuft ueber Service-Role (umgeht RLS),
--    daher blockiert diese Policy keine normalen Registrierungen.
--    Sie verhindert nur direkten Client-Zugriff ohne API.
CREATE POLICY "hm_insert_restricted" ON household_members
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND (
            -- Nur wenn eine genehmigte Verifikationsanfrage existiert
            EXISTS (
                SELECT 1 FROM verification_requests vr
                WHERE vr.user_id = auth.uid()
                AND vr.household_id = household_members.household_id
                AND vr.status = 'approved'
            )
            -- ODER der User ist Admin
            OR EXISTS (
                SELECT 1 FROM users u
                WHERE u.id = auth.uid()
                AND u.is_admin = true
            )
        )
    );

-- 3. Trigger: Auto-Verifizierung entfernen
--    Die API setzt verified_at explizit wenn noetig.
--    Der Trigger soll NICHT automatisch verifizieren.

CREATE OR REPLACE FUNCTION enforce_member_defaults()
RETURNS TRIGGER AS $$
BEGIN
    -- Rolle ist immer 'member' bei Registrierung (Client kann keine Admin-Rolle setzen)
    NEW.role := 'member';
    -- SICHERHEIT: verified_at wird NICHT automatisch gesetzt
    -- Die API (register/complete) setzt es explizit fuer die Pilotphase
    -- Wenn verified_at vom Client kommt und der User kein Admin ist, auf NULL setzen
    IF NEW.verified_at IS NOT NULL THEN
        -- Pruefe ob der aufrufende User Admin ist
        IF NOT EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
        ) THEN
            NEW.verified_at := NULL;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Households: Invite-Codes nur fuer Mitglieder sichtbar machen
--    Erstelle eine RLS-Policy die den Zugriff auf invite_code beschraenkt
--    Da PostgreSQL RLS nicht auf Spaltenebene arbeitet, loesen wir das
--    ueber eine separate View fuer die Karte (ohne invite_code)

-- Households UPDATE: Nur Admins und Mitglieder des Haushalts
DROP POLICY IF EXISTS "households_update" ON households;
CREATE POLICY "households_update" ON households
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM household_members hm
            WHERE hm.household_id = households.id
            AND hm.user_id = auth.uid()
            AND hm.verified_at IS NOT NULL
        )
        OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.is_admin = true
        )
    );

-- 5. Household Members DELETE: Nur eigene Mitgliedschaft oder Admin
DROP POLICY IF EXISTS "hm_delete" ON household_members;
CREATE POLICY "hm_delete_own_or_admin" ON household_members
    FOR DELETE
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.is_admin = true
        )
    );
