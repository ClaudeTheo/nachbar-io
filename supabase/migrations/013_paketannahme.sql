-- ============================================================
-- Nachbar.io — Migration 013: Paketannahme
-- Nachbarn koennen signalisieren dass sie Pakete annehmen
-- ============================================================

CREATE TABLE IF NOT EXISTS paketannahme (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    available_date DATE NOT NULL DEFAULT CURRENT_DATE,
    available_from TIME,
    available_until TIME,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, available_date)
);

CREATE INDEX IF NOT EXISTS idx_paketannahme_date ON paketannahme(available_date);
CREATE INDEX IF NOT EXISTS idx_paketannahme_user ON paketannahme(user_id);

-- RLS
ALTER TABLE paketannahme ENABLE ROW LEVEL SECURITY;

-- Lesen: Alle verifizierten Mitglieder
CREATE POLICY paketannahme_read ON paketannahme
    FOR SELECT USING (is_verified_member());

-- Erstellen: Nur eigene Eintraege
CREATE POLICY paketannahme_create ON paketannahme
    FOR INSERT WITH CHECK (
        is_verified_member()
        AND user_id = auth.uid()
    );

-- Aktualisieren: Nur eigene Eintraege
CREATE POLICY paketannahme_update ON paketannahme
    FOR UPDATE USING (
        is_verified_member()
        AND user_id = auth.uid()
    );

-- Loeschen: Nur eigene Eintraege
CREATE POLICY paketannahme_delete ON paketannahme
    FOR DELETE USING (
        is_verified_member()
        AND user_id = auth.uid()
    );
