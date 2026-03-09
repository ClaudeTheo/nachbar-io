-- ============================================================
-- Nachbar.io — Migration 012: Umfragen (Polls)
-- Nachbarn koennen Abstimmungen erstellen und teilnehmen
-- ============================================================

-- Umfragen
CREATE TABLE IF NOT EXISTS polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    multiple_choice BOOLEAN NOT NULL DEFAULT false,
    closes_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_polls_user ON polls(user_id);
CREATE INDEX IF NOT EXISTS idx_polls_status ON polls(status);

-- Antwort-Optionen
CREATE TABLE IF NOT EXISTS poll_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options(poll_id);

-- Stimmen
CREATE TABLE IF NOT EXISTS poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(poll_id, option_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user ON poll_votes(user_id);

-- RLS fuer polls
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY polls_read ON polls
    FOR SELECT USING (is_verified_member());

CREATE POLICY polls_create ON polls
    FOR INSERT WITH CHECK (
        is_verified_member()
        AND user_id = auth.uid()
    );

CREATE POLICY polls_update ON polls
    FOR UPDATE USING (
        is_verified_member()
        AND user_id = auth.uid()
    );

CREATE POLICY polls_delete ON polls
    FOR DELETE USING (
        is_verified_member()
        AND user_id = auth.uid()
    );

-- RLS fuer poll_options
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY poll_options_read ON poll_options
    FOR SELECT USING (is_verified_member());

CREATE POLICY poll_options_create ON poll_options
    FOR INSERT WITH CHECK (
        is_verified_member()
        AND EXISTS (
            SELECT 1 FROM polls WHERE polls.id = poll_id AND polls.user_id = auth.uid()
        )
    );

-- RLS fuer poll_votes
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY poll_votes_read ON poll_votes
    FOR SELECT USING (is_verified_member());

CREATE POLICY poll_votes_create ON poll_votes
    FOR INSERT WITH CHECK (
        is_verified_member()
        AND user_id = auth.uid()
    );

CREATE POLICY poll_votes_delete ON poll_votes
    FOR DELETE USING (
        is_verified_member()
        AND user_id = auth.uid()
    );
