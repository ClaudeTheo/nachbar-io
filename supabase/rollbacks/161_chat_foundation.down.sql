-- Rollback fuer Migration 161: Chat-Foundation
--
-- WARNUNG: Drop in umgekehrter Reihenfolge zur Anwendung.
-- Alle Nachrichten, Gruppen und Kontakt-Beziehungen gehen verloren.
-- Nur anwenden, wenn keine realen Nutzer-Daten produziert wurden.

BEGIN;

-- 1) RLS-Umbau auf conversations zurueckdrehen
DROP POLICY IF EXISTS conversations_contact_select ON conversations;
DROP POLICY IF EXISTS conversations_contact_insert ON conversations;
DROP POLICY IF EXISTS conversations_contact_update ON conversations;
DROP POLICY IF EXISTS conversations_contact_delete ON conversations;

-- Alte Quartier-Policies wiederherstellen
CREATE POLICY conversations_quarter_select ON conversations
    FOR SELECT
    USING (
        ((participant_1 = auth.uid()) OR (participant_2 = auth.uid()))
        AND ((quarter_id = get_user_quarter_id()) OR is_super_admin() OR is_quarter_admin_for(quarter_id))
    );

CREATE POLICY conversations_quarter_insert ON conversations
    FOR INSERT
    WITH CHECK (
        ((participant_1 = auth.uid()) OR (participant_2 = auth.uid()))
        AND ((quarter_id = get_user_quarter_id()) OR is_super_admin() OR is_quarter_admin_for(quarter_id))
    );

CREATE POLICY conversations_quarter_update ON conversations
    FOR UPDATE
    USING (
        ((participant_1 = auth.uid()) OR (participant_2 = auth.uid()))
        AND ((quarter_id = get_user_quarter_id()) OR is_super_admin() OR is_quarter_admin_for(quarter_id))
    );

CREATE POLICY conversations_quarter_delete ON conversations
    FOR DELETE
    USING (is_super_admin() OR is_quarter_admin_for(quarter_id));

-- 2) Helper-Funktionen entfernen
DROP FUNCTION IF EXISTS are_contacts(UUID, UUID);
DROP FUNCTION IF EXISTS is_group_admin(UUID, UUID);
DROP FUNCTION IF EXISTS is_group_member(UUID, UUID);

-- 3) Trigger + Funktion fuer Gruppen-Limit
DROP TRIGGER IF EXISTS trg_group_members_limit ON group_members;
DROP FUNCTION IF EXISTS enforce_group_member_limit();

-- 4) Medien-Spalten und CHECKs in direct_messages zuruecknehmen
ALTER TABLE direct_messages DROP CONSTRAINT IF EXISTS direct_messages_media_url_type_paired;
ALTER TABLE direct_messages DROP CONSTRAINT IF EXISTS direct_messages_content_or_media;
ALTER TABLE direct_messages ALTER COLUMN content SET NOT NULL;
ALTER TABLE direct_messages DROP COLUMN IF EXISTS media_duration_sec;
ALTER TABLE direct_messages DROP COLUMN IF EXISTS media_url;
ALTER TABLE direct_messages DROP COLUMN IF EXISTS media_type;

-- 5) Neue Tabellen droppen (Reihenfolge: FK-abhaengig zuerst)
DROP TABLE IF EXISTS group_messages;
DROP TABLE IF EXISTS group_members;
DROP TABLE IF EXISTS group_conversations;
DROP TABLE IF EXISTS contact_links;

COMMIT;
