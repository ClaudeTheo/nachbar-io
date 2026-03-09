-- ============================================================
-- Nachbar.io — Migration 011: Leihboerse
-- Nachbarn koennen Gegenstaende verleihen und ausleihen
-- ============================================================

CREATE TABLE IF NOT EXISTS leihboerse_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('lend', 'borrow')),
    category TEXT NOT NULL CHECK (category IN (
        'tools', 'garden', 'kitchen', 'sports', 'kids', 'electronics', 'books', 'other'
    )),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    deposit TEXT,
    available_until DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'reserved', 'done')),
    reserved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leihboerse_user ON leihboerse_items(user_id);
CREATE INDEX IF NOT EXISTS idx_leihboerse_status ON leihboerse_items(status);
CREATE INDEX IF NOT EXISTS idx_leihboerse_type ON leihboerse_items(type);

-- RLS
ALTER TABLE leihboerse_items ENABLE ROW LEVEL SECURITY;

-- Lesen: Alle verifizierten Mitglieder
CREATE POLICY leihboerse_read ON leihboerse_items
    FOR SELECT USING (is_verified_member());

-- Erstellen: Nur eigene Eintraege
CREATE POLICY leihboerse_create ON leihboerse_items
    FOR INSERT WITH CHECK (
        is_verified_member()
        AND user_id = auth.uid()
    );

-- Aktualisieren: Nur eigene Eintraege
CREATE POLICY leihboerse_update ON leihboerse_items
    FOR UPDATE USING (
        is_verified_member()
        AND user_id = auth.uid()
    );

-- Loeschen: Nur eigene Eintraege
CREATE POLICY leihboerse_delete ON leihboerse_items
    FOR DELETE USING (
        is_verified_member()
        AND user_id = auth.uid()
    );
