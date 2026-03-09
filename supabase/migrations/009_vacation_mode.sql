-- ============================================================
-- Nachbar.io — Migration 009: Urlaub-Modus
-- Bewohner koennen Urlaubszeitraum eintragen, Haus wird blau
-- ============================================================

CREATE TABLE IF NOT EXISTS vacation_modes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    note TEXT,
    notify_neighbors BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_vacation_user ON vacation_modes(user_id);
CREATE INDEX IF NOT EXISTS idx_vacation_active ON vacation_modes(start_date, end_date);

-- RLS
ALTER TABLE vacation_modes ENABLE ROW LEVEL SECURITY;

-- Lesen: Alle verifizierten Mitglieder (damit Nachbarn den Urlaub sehen)
CREATE POLICY vacation_read ON vacation_modes
    FOR SELECT USING (is_verified_member());

-- Erstellen: Nur eigene Eintraege
CREATE POLICY vacation_create ON vacation_modes
    FOR INSERT WITH CHECK (
        is_verified_member()
        AND user_id = auth.uid()
    );

-- Aktualisieren: Nur eigene Eintraege
CREATE POLICY vacation_update ON vacation_modes
    FOR UPDATE USING (
        user_id = auth.uid()
    );

-- Loeschen: Nur eigene Eintraege
CREATE POLICY vacation_delete ON vacation_modes
    FOR DELETE USING (
        user_id = auth.uid()
    );
