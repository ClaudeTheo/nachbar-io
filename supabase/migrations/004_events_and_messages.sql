-- ============================================================
-- Migration 004: Veranstaltungskalender & Direktnachrichten
-- Phase 2 Features für Nachbar.io
-- ============================================================

-- ============================================================
-- EVENTS (Veranstaltungskalender)
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    event_date DATE NOT NULL,
    event_time TIME,
    end_time TIME,
    category TEXT NOT NULL DEFAULT 'other'
        CHECK (category IN (
            'community', 'sports', 'culture', 'market',
            'kids', 'seniors', 'cleanup', 'other'
        )),
    max_participants INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Teilnehmer an Veranstaltungen
CREATE TABLE IF NOT EXISTS event_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'going'
        CHECK (status IN ('going', 'interested', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(event_id, user_id)
);

-- ============================================================
-- DIRECT_MESSAGES (1:1 Nachrichten)
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_1 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant_2 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(participant_1, participant_2),
    CHECK (participant_1 < participant_2)
);

CREATE TABLE IF NOT EXISTS direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_event_participants_event ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_p1 ON conversations(participant_1);
CREATE INDEX IF NOT EXISTS idx_conversations_p2 ON conversations(participant_2);
CREATE INDEX IF NOT EXISTS idx_dm_conversation ON direct_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_unread ON direct_messages(conversation_id) WHERE read_at IS NULL;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Events: Alle verifizierten Mitglieder können lesen und erstellen
CREATE POLICY events_read ON events
    FOR SELECT USING (is_verified_member());
CREATE POLICY events_create ON events
    FOR INSERT WITH CHECK (is_verified_member() AND user_id = auth.uid());
CREATE POLICY events_update_own ON events
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY events_delete_own ON events
    FOR DELETE USING (user_id = auth.uid());

-- Event-Teilnehmer: Lesen für alle, Verwalten nur eigene
CREATE POLICY ep_read ON event_participants
    FOR SELECT USING (is_verified_member());
CREATE POLICY ep_manage_own ON event_participants
    FOR ALL USING (user_id = auth.uid());

-- Conversations: Nur eigene Gespräche sehen
CREATE POLICY conv_read ON conversations
    FOR SELECT USING (participant_1 = auth.uid() OR participant_2 = auth.uid());
CREATE POLICY conv_create ON conversations
    FOR INSERT WITH CHECK (
        is_verified_member()
        AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
    );

-- Direktnachrichten: Nur eigene Gespräche sehen, nur eigene senden
CREATE POLICY dm_read ON direct_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = conversation_id
            AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
        )
    );
CREATE POLICY dm_create ON direct_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = conversation_id
            AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
        )
    );
