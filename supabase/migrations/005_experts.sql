-- ============================================================
-- Migration 005: Verifizierte lokale Experten
-- Bewertungen und Empfehlungen fuer Nachbarschafts-Experten
-- ============================================================

-- ============================================================
-- EXPERT REVIEWS (Bewertungen mit Sternen + Kommentar)
-- ============================================================
CREATE TABLE IF NOT EXISTS expert_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_category TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Ein Nutzer kann pro Experte pro Kategorie nur 1 Bewertung abgeben
    UNIQUE(expert_user_id, reviewer_user_id, skill_category),
    -- Keine Selbstbewertung
    CHECK(expert_user_id != reviewer_user_id)
);

-- ============================================================
-- EXPERT ENDORSEMENTS (Einfache Empfehlungen / Daumen hoch)
-- ============================================================
CREATE TABLE IF NOT EXISTS expert_endorsements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endorser_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_category TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Ein Nutzer kann pro Experte pro Kategorie nur 1x empfehlen
    UNIQUE(expert_user_id, endorser_user_id, skill_category),
    -- Keine Selbstempfehlung
    CHECK(expert_user_id != endorser_user_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_expert_reviews_expert ON expert_reviews(expert_user_id);
CREATE INDEX IF NOT EXISTS idx_expert_reviews_category ON expert_reviews(skill_category);
CREATE INDEX IF NOT EXISTS idx_expert_endorsements_expert ON expert_endorsements(expert_user_id);
CREATE INDEX IF NOT EXISTS idx_expert_endorsements_category ON expert_endorsements(skill_category);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE expert_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_endorsements ENABLE ROW LEVEL SECURITY;

-- Reviews: Alle verifizierten Mitglieder koennen lesen
CREATE POLICY reviews_read ON expert_reviews
    FOR SELECT USING (is_verified_member());

-- Reviews: Nur eigene erstellen (nicht sich selbst bewerten)
CREATE POLICY reviews_create ON expert_reviews
    FOR INSERT WITH CHECK (
        is_verified_member()
        AND reviewer_user_id = auth.uid()
        AND expert_user_id != auth.uid()
    );

-- Reviews: Nur eigene loeschen
CREATE POLICY reviews_delete_own ON expert_reviews
    FOR DELETE USING (reviewer_user_id = auth.uid());

-- Reviews: Nur eigene aktualisieren
CREATE POLICY reviews_update_own ON expert_reviews
    FOR UPDATE USING (reviewer_user_id = auth.uid());

-- Endorsements: Alle verifizierten Mitglieder koennen lesen
CREATE POLICY endorsements_read ON expert_endorsements
    FOR SELECT USING (is_verified_member());

-- Endorsements: Nur eigene erstellen
CREATE POLICY endorsements_create ON expert_endorsements
    FOR INSERT WITH CHECK (
        is_verified_member()
        AND endorser_user_id = auth.uid()
        AND expert_user_id != auth.uid()
    );

-- Endorsements: Nur eigene loeschen (Toggle-Funktion)
CREATE POLICY endorsements_delete_own ON expert_endorsements
    FOR DELETE USING (endorser_user_id = auth.uid());
