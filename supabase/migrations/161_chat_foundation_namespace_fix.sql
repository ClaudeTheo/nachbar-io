-- Migration 161-Fix: Namenskonflikt-Aufloesung fuer Chat-Foundation
--
-- HISTORISCHER KONTEXT:
-- Migration 161_chat_foundation.sql hat CREATE TABLE IF NOT EXISTS group_members
-- ausgefuehrt. Es existierte aber BEREITS eine group_members-Tabelle aus
-- Migration 133_gruppen_tables.sql (Interest-Groups-Modul, keine Chat-Gruppen).
-- Die IF-NOT-EXISTS-Klausel hat korrekt verhindert dass die Tabelle
-- ueberschrieben wird, aber:
--   - Mein Trigger trg_group_members_limit wurde auf die EXISTIERENDE
--     Tabelle gelegt und haette Interest-Group-Joins ab 10 Mitgliedern blockiert
--   - Meine RLS-Policies gm_* wurden auf die EXISTIERENDE Tabelle gelegt und
--     haetten die Interest-Groups-Logik mit Chat-Logik ueberlagert
--
-- Dieser FIX macht folgendes:
--   1) Den falsch-applizierten Trigger + Policies von der bestehenden
--      group_members-Tabelle entfernen (stellt den Zustand vor 161 wieder her)
--   2) Meine neuen Tabellen umbenennen in den chat_*-Namespace:
--        group_conversations  -> chat_groups
--        group_messages       -> chat_group_messages
--        + neue Tabelle       -> chat_group_members
--   3) Helper-Funktionen entsprechend neu anlegen (is_chat_group_member usw.)
--   4) RLS-Policies + Trigger auf die chat_*-Tabellen neu aufsetzen
--
-- Angewandt auf Prod: 2026-04-17 (Migration-Name: chat_foundation_fix_namespace_collision_v2)

BEGIN;

-- 1) Falsch-applizierten Trigger + Policies von bestehender group_members entfernen
DROP TRIGGER IF EXISTS trg_group_members_limit ON group_members;
DROP POLICY IF EXISTS gm_select ON group_members;
DROP POLICY IF EXISTS gm_insert ON group_members;
DROP POLICY IF EXISTS gm_update ON group_members;
DROP POLICY IF EXISTS gm_delete ON group_members;

-- 2) Falsch-applizierte Policies auf group_conversations/group_messages entfernen
DROP POLICY IF EXISTS gc_select ON group_conversations;
DROP POLICY IF EXISTS gc_insert ON group_conversations;
DROP POLICY IF EXISTS gc_update ON group_conversations;
DROP POLICY IF EXISTS gc_delete ON group_conversations;
DROP POLICY IF EXISTS gmsg_select ON group_messages;
DROP POLICY IF EXISTS gmsg_insert ON group_messages;
DROP POLICY IF EXISTS gmsg_delete ON group_messages;

-- 3) RLS auf bestehender group_members ggf. wieder deaktivieren,
--    falls durch 161 erst aktiviert wurde und jetzt keine Policies mehr existieren
DO $$
DECLARE
    policy_count INT;
    rls_enabled BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO policy_count FROM pg_policies
        WHERE tablename = 'group_members';
    SELECT relrowsecurity INTO rls_enabled FROM pg_class
        WHERE relname = 'group_members' AND relkind = 'r';

    IF policy_count = 0 AND rls_enabled THEN
        ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 4) Jetzt koennen alte Helper-Funktionen entfernt werden
DROP FUNCTION IF EXISTS is_group_member(UUID, UUID);
DROP FUNCTION IF EXISTS is_group_admin(UUID, UUID);
DROP FUNCTION IF EXISTS enforce_group_member_limit();

-- 5) Umbenennen
ALTER TABLE IF EXISTS group_conversations RENAME TO chat_groups;
ALTER INDEX IF EXISTS idx_group_conversations_last_message
    RENAME TO idx_chat_groups_last_message;

ALTER TABLE IF EXISTS group_messages RENAME TO chat_group_messages;
ALTER INDEX IF EXISTS idx_group_messages_group_created
    RENAME TO idx_chat_group_messages_group_created;

-- 6) Neue Tabelle chat_group_members
CREATE TABLE IF NOT EXISTS chat_group_members (
    group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member'
        CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_read_at TIMESTAMPTZ,
    PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_group_members_user
    ON chat_group_members(user_id);

COMMENT ON TABLE chat_group_members IS
    'Mitgliedschaft in Chat-Gruppen (max 10). Nicht zu verwechseln mit group_members aus Mig 133 (Interest-Groups).';

-- 7) Trigger auf chat_group_members
CREATE OR REPLACE FUNCTION enforce_chat_group_member_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    member_count INT;
BEGIN
    SELECT COUNT(*) INTO member_count
    FROM chat_group_members
    WHERE group_id = NEW.group_id;

    IF member_count >= 10 THEN
        RAISE EXCEPTION 'Chat-Gruppe hat Maximum von 10 Mitgliedern erreicht'
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_chat_group_members_limit ON chat_group_members;
CREATE TRIGGER trg_chat_group_members_limit
    BEFORE INSERT ON chat_group_members
    FOR EACH ROW
    EXECUTE FUNCTION enforce_chat_group_member_limit();

-- 8) Helper-Funktionen mit chat_*-Prefix
CREATE OR REPLACE FUNCTION is_chat_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
    SELECT EXISTS (
        SELECT 1 FROM chat_group_members
        WHERE group_id = p_group_id AND user_id = p_user_id
    );
$fn$;

CREATE OR REPLACE FUNCTION is_chat_group_admin(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
    SELECT EXISTS (
        SELECT 1 FROM chat_group_members
        WHERE group_id = p_group_id AND user_id = p_user_id AND role = 'admin'
    );
$fn$;

-- 9) RLS neu aufsetzen
ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY cg_select ON chat_groups
    FOR SELECT USING (is_chat_group_member(id, auth.uid()));
CREATE POLICY cg_insert ON chat_groups
    FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY cg_update ON chat_groups
    FOR UPDATE USING (is_chat_group_admin(id, auth.uid()))
    WITH CHECK (is_chat_group_admin(id, auth.uid()));
CREATE POLICY cg_delete ON chat_groups
    FOR DELETE USING (is_chat_group_admin(id, auth.uid()));

CREATE POLICY cgm_select ON chat_group_members
    FOR SELECT USING (is_chat_group_member(group_id, auth.uid()));
CREATE POLICY cgm_insert ON chat_group_members
    FOR INSERT WITH CHECK (
        (auth.uid() = user_id AND role = 'admin' AND NOT EXISTS (
            SELECT 1 FROM chat_group_members cgm2 WHERE cgm2.group_id = chat_group_members.group_id
        ))
        OR is_chat_group_admin(group_id, auth.uid())
    );
CREATE POLICY cgm_update ON chat_group_members
    FOR UPDATE USING (
        is_chat_group_admin(group_id, auth.uid()) OR auth.uid() = user_id
    )
    WITH CHECK (
        is_chat_group_admin(group_id, auth.uid())
        OR (auth.uid() = user_id AND role = 'member')
    );
CREATE POLICY cgm_delete ON chat_group_members
    FOR DELETE USING (
        is_chat_group_admin(group_id, auth.uid()) OR auth.uid() = user_id
    );

CREATE POLICY cgmsg_select ON chat_group_messages
    FOR SELECT USING (is_chat_group_member(group_id, auth.uid()));
CREATE POLICY cgmsg_insert ON chat_group_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND is_chat_group_member(group_id, auth.uid())
    );
CREATE POLICY cgmsg_delete ON chat_group_messages
    FOR DELETE USING (
        auth.uid() = sender_id OR is_chat_group_admin(group_id, auth.uid())
    );

COMMIT;
