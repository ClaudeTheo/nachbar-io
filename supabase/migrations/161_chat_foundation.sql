-- Migration 161: Chat-Foundation — Kontakte, Gruppen-Chat, Media-Anhaenge
--
-- STATUS: ENTWURF — NICHT ANGEWENDET
-- Plan-Dokument: docs/plans/2026-04-17-mvp-scope-quartier-plus-bruecken.md
-- Vorgaenger:    docs/plans/2026-04-17-positioning-blitz-opus.md
--
-- Zweck:
--   1) contact_links: Freundschafts-/Kreis-Beziehungen quer ueber
--      Quartiersgrenzen (auch CH/AT). Loest die bisherige
--      quartier-gebundene Chat-RLS ab.
--   2) group_conversations, group_members, group_messages: Gruppen-Chat
--      fuer Familien und kleine Freundes-/Nachbarschafts-Kreise, max
--      10 Mitglieder je Gruppe (Enforcement per Trigger).
--   3) direct_messages erweitert um media_type, media_url, media_duration_sec
--      fuer Bilder und Sprachnachrichten.
--   4) RLS auf conversations umgebaut: Chat-Gate ist jetzt
--      contact_links.status = 'accepted' (oder Gruppen-Mitgliedschaft),
--      NICHT mehr quarter_id-Gleichheit. Cross-Quartier-Chat wird damit
--      der Normalfall, nicht die Ausnahme.
--
-- Warum diese Umstellung:
--   Das neue Positioning ("Quartier plus Bruecken") macht Cross-Quartier-
--   Chat zur Kern-Funktion. Die alte RLS erzwang identisches Quartier,
--   was DACH-Brueckenschlaege (Freund in Zuerich, Schwester in Wien)
--   unmoeglich machte. Die contact-basierte RLS ersetzt das Quartier-
--   als-Sichtbarkeitsgrenze durch das Kontakt-als-Sichtbarkeitsgrenze.
--
-- Was NICHT in dieser Migration steckt:
--   - Storage-Bucket fuer Chat-Medien (kommt in 162_chat_media_storage.sql)
--   - Triggers fuer last_message_at-Aktualisierung (MVP macht das App-seitig)
--   - End-to-End-Verschluesselung (bewusst spaeter)
--   - Read-Receipts fuer Gruppen (group_messages.read_by JSONB bleibt leer
--     im MVP, UI zeigt nur 1:1-Read-Receipts)
--
-- Reihenfolge fuer Anwendung:
--   (a) MCP apply_migration(name="chat_foundation") mit diesem Inhalt
--   (b) MCP execute_sql mit Verifikations-SELECTs am Ende
--   (c) Migration 162_chat_media_storage.sql folgt
--
-- Rollback: 161_chat_foundation.down.sql (separate Datei)

BEGIN;

-- ============================================================
-- 1) contact_links — persoenliche Kreis-Beziehungen
-- ============================================================
-- Zwei-Wege-Beziehung: Requester stellt Anfrage, Addressee akzeptiert.
-- PRIMARY KEY ist das Paar; bei Symmetrie (A lädt B ein, B lädt A ein)
-- wird der zweite INSERT durch PK-Konflikt verhindert — App-Layer muss
-- beide Richtungen bei Suche abfragen.
--
-- status:
--   'pending'   — Anfrage gestellt, Empfaenger hat noch nicht reagiert
--   'accepted'  — Empfaenger hat akzeptiert, Chat ist freigeschaltet
--   'rejected'  — Empfaenger hat abgelehnt; Anfrage kann erneut gestellt
--                 werden nach 7 Tagen (App-Layer-Rule, nicht DB-enforced)
--   'blocked'   — Empfaenger blockiert; Requester kann keine neue Anfrage
--                 stellen (DB-enforced ueber INSERT-Policy)
CREATE TABLE IF NOT EXISTS contact_links (
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    note TEXT
        CHECK (note IS NULL OR char_length(note) BETWEEN 1 AND 280),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at TIMESTAMPTZ,
    PRIMARY KEY (requester_id, addressee_id),
    CHECK (requester_id <> addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_links_addressee
    ON contact_links(addressee_id, status);
CREATE INDEX IF NOT EXISTS idx_contact_links_requester_accepted
    ON contact_links(requester_id, status)
    WHERE status = 'accepted';

COMMENT ON TABLE contact_links IS
    'Persoenliche Kreis-Beziehungen (Kontakte/Freunde), quartier-unabhaengig';
COMMENT ON COLUMN contact_links.note IS
    'Optionale Nachricht bei Kontaktanfrage, max 280 Zeichen';

-- ============================================================
-- 2) group_conversations — Gruppen-Chat-Container
-- ============================================================
-- Max 10 Mitglieder pro Gruppe (App-enforced via Trigger unten).
-- created_by ist initialer Admin; weitere Admins via group_members.role.
CREATE TABLE IF NOT EXISTS group_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
    description TEXT CHECK (description IS NULL OR char_length(description) <= 500),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_message_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_conversations_last_message
    ON group_conversations(last_message_at DESC);

COMMENT ON TABLE group_conversations IS
    'Gruppen-Chat-Container, max 10 Mitglieder (Trigger-enforced)';

-- ============================================================
-- 3) group_members — Mitgliedschaft in Gruppen-Chats
-- ============================================================
CREATE TABLE IF NOT EXISTS group_members (
    group_id UUID NOT NULL REFERENCES group_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member'
        CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_read_at TIMESTAMPTZ,
    PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_user
    ON group_members(user_id);

COMMENT ON TABLE group_members IS
    'User-Mitgliedschaft in Gruppen-Chats. last_read_at dient Unread-Counter';

-- ============================================================
-- 4) group_messages — Nachrichten in Gruppen-Chats
-- ============================================================
-- Gleiche Medien-Felder wie direct_messages (siehe 5)) fuer Konsistenz.
CREATE TABLE IF NOT EXISTS group_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES group_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT,
    media_type TEXT
        CHECK (media_type IS NULL OR media_type IN ('image', 'audio')),
    media_url TEXT,
    media_duration_sec INT
        CHECK (media_duration_sec IS NULL OR (media_duration_sec > 0 AND media_duration_sec <= 60)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Mindestens Content oder Media muss gesetzt sein
    CHECK (content IS NOT NULL OR media_url IS NOT NULL),
    -- Wenn media_url gesetzt, muss media_type auch gesetzt sein
    CHECK ((media_url IS NULL) = (media_type IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_group_messages_group_created
    ON group_messages(group_id, created_at DESC);

COMMENT ON TABLE group_messages IS
    'Nachrichten in Gruppen-Chats mit optionalem Bild/Audio-Anhang (max 60 Sek)';

-- ============================================================
-- 5) direct_messages — Medien-Felder ergaenzen
-- ============================================================
-- Idempotent: ADD COLUMN IF NOT EXISTS funktioniert ab PG 9.6+.
ALTER TABLE direct_messages
    ADD COLUMN IF NOT EXISTS media_type TEXT
        CHECK (media_type IS NULL OR media_type IN ('image', 'audio'));
ALTER TABLE direct_messages
    ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE direct_messages
    ADD COLUMN IF NOT EXISTS media_duration_sec INT
        CHECK (media_duration_sec IS NULL OR (media_duration_sec > 0 AND media_duration_sec <= 60));

-- content war bisher NOT NULL — fuer reine Medien-Nachrichten lockern:
ALTER TABLE direct_messages
    ALTER COLUMN content DROP NOT NULL;

-- Invariante: mindestens eines muss gesetzt sein.
-- Vorhandene Zeilen pruefen (sollte trivial sein, da content bisher NOT NULL war)
-- und Check nachziehen:
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'direct_messages_content_or_media'
    ) THEN
        ALTER TABLE direct_messages
            ADD CONSTRAINT direct_messages_content_or_media
            CHECK (content IS NOT NULL OR media_url IS NOT NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'direct_messages_media_url_type_paired'
    ) THEN
        ALTER TABLE direct_messages
            ADD CONSTRAINT direct_messages_media_url_type_paired
            CHECK ((media_url IS NULL) = (media_type IS NULL));
    END IF;
END $$;

-- ============================================================
-- 6) Trigger: Gruppe max 10 Mitglieder
-- ============================================================
CREATE OR REPLACE FUNCTION enforce_group_member_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    member_count INT;
BEGIN
    SELECT COUNT(*) INTO member_count
    FROM group_members
    WHERE group_id = NEW.group_id;

    IF member_count >= 10 THEN
        RAISE EXCEPTION 'Gruppe hat Maximum von 10 Mitgliedern erreicht'
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_group_members_limit ON group_members;
CREATE TRIGGER trg_group_members_limit
    BEFORE INSERT ON group_members
    FOR EACH ROW
    EXECUTE FUNCTION enforce_group_member_limit();

-- ============================================================
-- 7) RLS: contact_links
-- ============================================================
ALTER TABLE contact_links ENABLE ROW LEVEL SECURITY;

-- SELECT: Nutzer sieht Kontakte, in denen er Requester ODER Addressee ist
DROP POLICY IF EXISTS contact_links_select ON contact_links;
CREATE POLICY contact_links_select ON contact_links
    FOR SELECT
    USING (
        auth.uid() = requester_id
        OR auth.uid() = addressee_id
    );

-- INSERT: Nur als Requester, nicht an sich selbst, und nicht wenn
-- Addressee den Requester bereits blockiert hat.
DROP POLICY IF EXISTS contact_links_insert ON contact_links;
CREATE POLICY contact_links_insert ON contact_links
    FOR INSERT
    WITH CHECK (
        auth.uid() = requester_id
        AND requester_id <> addressee_id
        AND NOT EXISTS (
            SELECT 1 FROM contact_links cl
            WHERE cl.requester_id = contact_links.addressee_id
              AND cl.addressee_id = contact_links.requester_id
              AND cl.status = 'blocked'
        )
    );

-- UPDATE: Addressee darf status aendern (accept/reject/block),
-- Requester darf nur cancellen (status -> rejected als self-cancel).
DROP POLICY IF EXISTS contact_links_update_addressee ON contact_links;
CREATE POLICY contact_links_update_addressee ON contact_links
    FOR UPDATE
    USING (auth.uid() = addressee_id)
    WITH CHECK (auth.uid() = addressee_id);

DROP POLICY IF EXISTS contact_links_update_requester_cancel ON contact_links;
CREATE POLICY contact_links_update_requester_cancel ON contact_links
    FOR UPDATE
    USING (auth.uid() = requester_id AND status = 'pending')
    WITH CHECK (auth.uid() = requester_id AND status IN ('pending', 'rejected'));

-- DELETE: Nur der Addressee darf einen Kontakt loeschen (= Kreis verlassen).
-- Requester kann nur rejecten, nicht loeschen.
DROP POLICY IF EXISTS contact_links_delete ON contact_links;
CREATE POLICY contact_links_delete ON contact_links
    FOR DELETE
    USING (auth.uid() = addressee_id OR auth.uid() = requester_id);

-- ============================================================
-- 8) RLS: group_conversations + group_members + group_messages
-- ============================================================
ALTER TABLE group_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

-- Helper-Funktion: Ist User Mitglied der Gruppe?
CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM group_members
        WHERE group_id = p_group_id AND user_id = p_user_id
    );
$$;

-- Helper-Funktion: Ist User Admin der Gruppe?
CREATE OR REPLACE FUNCTION is_group_admin(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM group_members
        WHERE group_id = p_group_id AND user_id = p_user_id AND role = 'admin'
    );
$$;

-- group_conversations
DROP POLICY IF EXISTS gc_select ON group_conversations;
CREATE POLICY gc_select ON group_conversations
    FOR SELECT
    USING (is_group_member(id, auth.uid()));

DROP POLICY IF EXISTS gc_insert ON group_conversations;
CREATE POLICY gc_insert ON group_conversations
    FOR INSERT
    WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS gc_update ON group_conversations;
CREATE POLICY gc_update ON group_conversations
    FOR UPDATE
    USING (is_group_admin(id, auth.uid()))
    WITH CHECK (is_group_admin(id, auth.uid()));

DROP POLICY IF EXISTS gc_delete ON group_conversations;
CREATE POLICY gc_delete ON group_conversations
    FOR DELETE
    USING (is_group_admin(id, auth.uid()));

-- group_members
DROP POLICY IF EXISTS gm_select ON group_members;
CREATE POLICY gm_select ON group_members
    FOR SELECT
    USING (is_group_member(group_id, auth.uid()));

-- INSERT: Creator fuegt sich selbst als Admin hinzu (beim Gruppen-Erstellen)
-- ODER Admin fuegt andere hinzu
DROP POLICY IF EXISTS gm_insert ON group_members;
CREATE POLICY gm_insert ON group_members
    FOR INSERT
    WITH CHECK (
        -- Selbst-Insert als Admin beim ersten Eintrag (Creator)
        (auth.uid() = user_id AND role = 'admin' AND NOT EXISTS (
            SELECT 1 FROM group_members WHERE group_id = group_members.group_id
        ))
        -- Oder Admin fuegt Member hinzu
        OR is_group_admin(group_id, auth.uid())
    );

-- UPDATE: Admin kann Rollen aendern + last_read_at
-- Member kann nur eigenes last_read_at updaten
DROP POLICY IF EXISTS gm_update ON group_members;
CREATE POLICY gm_update ON group_members
    FOR UPDATE
    USING (
        is_group_admin(group_id, auth.uid())
        OR (auth.uid() = user_id)
    )
    WITH CHECK (
        is_group_admin(group_id, auth.uid())
        OR (auth.uid() = user_id AND role = 'member')
    );

-- DELETE: Admin kann andere entfernen, jeder kann sich selbst entfernen (verlassen)
DROP POLICY IF EXISTS gm_delete ON group_members;
CREATE POLICY gm_delete ON group_members
    FOR DELETE
    USING (
        is_group_admin(group_id, auth.uid())
        OR auth.uid() = user_id
    );

-- group_messages
DROP POLICY IF EXISTS gmsg_select ON group_messages;
CREATE POLICY gmsg_select ON group_messages
    FOR SELECT
    USING (is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS gmsg_insert ON group_messages;
CREATE POLICY gmsg_insert ON group_messages
    FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
        AND is_group_member(group_id, auth.uid())
    );

-- Nachrichten sind unveraenderlich (kein UPDATE).
-- DELETE nur durch Absender oder Admin:
DROP POLICY IF EXISTS gmsg_delete ON group_messages;
CREATE POLICY gmsg_delete ON group_messages
    FOR DELETE
    USING (
        auth.uid() = sender_id
        OR is_group_admin(group_id, auth.uid())
    );

-- ============================================================
-- 9) RLS-Umbau: conversations + direct_messages (1:1)
-- ============================================================
-- Alte Quartier-RLS ersetzen durch contact-basierte RLS.
-- Die bisherige Logik (participant_1/2 muss identisches Quartier haben)
-- wird entfernt. Stattdessen: mindestens einer der Teilnehmer muss den
-- anderen als accepted Kontakt haben (bilaterale Sichtbarkeit via Kontakt).
--
-- Helper-Funktion: Haben A und B einen accepted Kontakt?
CREATE OR REPLACE FUNCTION are_contacts(p_user_a UUID, p_user_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM contact_links
        WHERE status = 'accepted'
          AND (
              (requester_id = p_user_a AND addressee_id = p_user_b)
              OR (requester_id = p_user_b AND addressee_id = p_user_a)
          )
    );
$$;

-- Alte Policies entfernen
DROP POLICY IF EXISTS conversations_quarter_select ON conversations;
DROP POLICY IF EXISTS conversations_quarter_insert ON conversations;
DROP POLICY IF EXISTS conversations_quarter_update ON conversations;
DROP POLICY IF EXISTS conversations_quarter_delete ON conversations;

-- Neue contact-basierte Policies
CREATE POLICY conversations_contact_select ON conversations
    FOR SELECT
    USING (
        (participant_1 = auth.uid() OR participant_2 = auth.uid())
        AND are_contacts(participant_1, participant_2)
    );

-- INSERT: Chat starten nur wenn Kontakt accepted
CREATE POLICY conversations_contact_insert ON conversations
    FOR INSERT
    WITH CHECK (
        (participant_1 = auth.uid() OR participant_2 = auth.uid())
        AND are_contacts(participant_1, participant_2)
    );

-- UPDATE: last_message_at aktualisieren duerfen beide Teilnehmer
CREATE POLICY conversations_contact_update ON conversations
    FOR UPDATE
    USING (participant_1 = auth.uid() OR participant_2 = auth.uid())
    WITH CHECK (participant_1 = auth.uid() OR participant_2 = auth.uid());

-- DELETE: Beide Teilnehmer koennen die Konversation loeschen
-- (Uebergangsregel: alle Nachrichten kaskadieren mit, da ON DELETE CASCADE)
CREATE POLICY conversations_contact_delete ON conversations
    FOR DELETE
    USING (participant_1 = auth.uid() OR participant_2 = auth.uid());

-- direct_messages: bestehende dm_read und dm_create basieren auf
-- conversations-Teilnahme und bleiben gueltig. Nichts zu tun.

-- ============================================================
-- 10) Verifikations-SELECTs (nach apply_migration ausfuehren)
-- ============================================================
-- SELECT COUNT(*) AS contact_links_exists FROM contact_links;   -- erwartet: 0
-- SELECT COUNT(*) AS groups_exists FROM group_conversations;     -- erwartet: 0
-- SELECT tablename, policyname FROM pg_policies
--   WHERE tablename IN ('contact_links','group_conversations','group_members',
--                       'group_messages','conversations')
--   ORDER BY tablename, policyname;
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'direct_messages' AND column_name LIKE 'media%';

COMMIT;
