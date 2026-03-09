-- ============================================================
-- Nachbar.io — Migration 008: Nachbar-Verbindungen
-- Ermoeglicht Verbindungsanfragen zwischen Nachbarn
-- ============================================================

CREATE TABLE IF NOT EXISTS neighbor_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at TIMESTAMPTZ,
    UNIQUE(requester_id, target_id),
    CHECK (requester_id != target_id)
);

CREATE INDEX IF NOT EXISTS idx_nc_requester ON neighbor_connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_nc_target_status ON neighbor_connections(target_id, status);

-- RLS
ALTER TABLE neighbor_connections ENABLE ROW LEVEL SECURITY;

-- Lesen: Nur eigene Verbindungen (als Anfragender oder Empfaenger)
CREATE POLICY nc_read ON neighbor_connections
    FOR SELECT USING (
        is_verified_member()
        AND (requester_id = auth.uid() OR target_id = auth.uid())
    );

-- Erstellen: Nur verifizierte Mitglieder, nur als Anfragender
CREATE POLICY nc_create ON neighbor_connections
    FOR INSERT WITH CHECK (
        is_verified_member()
        AND requester_id = auth.uid()
    );

-- Aktualisieren: Nur der Empfaenger darf Status aendern (annehmen/ablehnen)
CREATE POLICY nc_update ON neighbor_connections
    FOR UPDATE USING (
        is_verified_member()
        AND target_id = auth.uid()
    );

-- Loeschen: Beide Parteien duerfen die Verbindung loeschen
CREATE POLICY nc_delete ON neighbor_connections
    FOR DELETE USING (
        is_verified_member()
        AND (requester_id = auth.uid() OR target_id = auth.uid())
    );
