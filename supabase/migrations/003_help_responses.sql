-- Hilfe-Börse Antworten: Nachrichten zwischen Hilfesuchenden und Helfern
-- Ermöglicht Kommunikation innerhalb eines Hilfe-Eintrags

CREATE TABLE IF NOT EXISTS help_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    help_request_id UUID NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
    responder_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index für schnelles Laden der Antworten
CREATE INDEX IF NOT EXISTS idx_help_responses_request ON help_responses(help_request_id, created_at);

-- RLS aktivieren
ALTER TABLE help_responses ENABLE ROW LEVEL SECURITY;

-- Alle verifizierten Quartiermitglieder können Antworten lesen
CREATE POLICY help_responses_read ON help_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM household_members hm WHERE hm.user_id = auth.uid()
        )
    );

-- Verifizierte Nutzer können Antworten erstellen
CREATE POLICY help_responses_create ON help_responses
    FOR INSERT WITH CHECK (
        auth.uid() = responder_user_id
        AND EXISTS (
            SELECT 1 FROM household_members hm WHERE hm.user_id = auth.uid()
        )
    );

-- Eigene Antworten löschen
CREATE POLICY help_responses_delete_own ON help_responses
    FOR DELETE USING (auth.uid() = responder_user_id);
