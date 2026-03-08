-- Migration 006: Hilfe-Unterkategorien + Nachbarschafts-Tipps
-- Erweitert das Hilfe-System um optionale Unterkategorien
-- und fuegt ein neues Community-Tipps-Modul hinzu (Anti-Facebook: kooperativ, sachlich)

-- ============================================================
-- FEATURE A: Hilfe-Unterkategorien
-- ============================================================

-- Optionale Subkategorie fuer bestehende Hilfe-Anfragen
ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- ============================================================
-- FEATURE B: Nachbarschafts-Tipps
-- ============================================================

-- Tipps-Tabelle (lokale Empfehlungen, Handwerker, Geschaefte etc.)
CREATE TABLE IF NOT EXISTS community_tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    business_name TEXT,              -- Optional: Name des Betriebs/Geschaefts
    description TEXT NOT NULL,
    location_hint TEXT,              -- z.B. "Hauptstrasse 12" oder "Nahe Muensterplatz"
    contact_hint TEXT,               -- z.B. "Tel: 07761..." (freiwillig)
    confirmation_count INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'reported')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bestaetigungen (NICHT "Likes" — sachliche Bestaetigung)
CREATE TABLE IF NOT EXISTS tip_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tip_id UUID NOT NULL REFERENCES community_tips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tip_id, user_id)
);

-- Indizes fuer Performance
CREATE INDEX IF NOT EXISTS idx_community_tips_category ON community_tips(category);
CREATE INDEX IF NOT EXISTS idx_community_tips_status ON community_tips(status);
CREATE INDEX IF NOT EXISTS idx_community_tips_created ON community_tips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_tips_user ON community_tips(user_id);
CREATE INDEX IF NOT EXISTS idx_tip_confirmations_tip ON tip_confirmations(tip_id);
CREATE INDEX IF NOT EXISTS idx_tip_confirmations_user ON tip_confirmations(user_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_subcategory ON help_requests(subcategory);

-- ============================================================
-- RLS Policies: Nur verifizierte Haushaltsmitglieder
-- ============================================================

ALTER TABLE community_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE tip_confirmations ENABLE ROW LEVEL SECURITY;

-- Tipps lesen: alle authentifizierten Nutzer mit Haushaltszuordnung
CREATE POLICY "tips_select" ON community_tips FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM household_members hm
            WHERE hm.user_id = auth.uid()
            AND hm.verified_at IS NOT NULL
        )
    );

-- Tipps erstellen: verifizierte Mitglieder
CREATE POLICY "tips_insert" ON community_tips FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM household_members hm
            WHERE hm.user_id = auth.uid()
            AND hm.verified_at IS NOT NULL
        )
    );

-- Tipps bearbeiten: nur eigene
CREATE POLICY "tips_update" ON community_tips FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Tipps loeschen: nur eigene
CREATE POLICY "tips_delete" ON community_tips FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Bestaetigungen lesen: alle authentifizierten Nutzer
CREATE POLICY "confirmations_select" ON tip_confirmations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM household_members hm
            WHERE hm.user_id = auth.uid()
            AND hm.verified_at IS NOT NULL
        )
    );

-- Bestaetigungen erstellen: verifizierte Mitglieder
CREATE POLICY "confirmations_insert" ON tip_confirmations FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM household_members hm
            WHERE hm.user_id = auth.uid()
            AND hm.verified_at IS NOT NULL
        )
    );

-- Bestaetigungen loeschen: nur eigene (Toggle)
CREATE POLICY "confirmations_delete" ON tip_confirmations FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================
-- Trigger: confirmation_count automatisch aktualisieren
-- ============================================================

CREATE OR REPLACE FUNCTION update_tip_confirmation_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE community_tips
        SET confirmation_count = confirmation_count + 1
        WHERE id = NEW.tip_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE community_tips
        SET confirmation_count = confirmation_count - 1
        WHERE id = OLD.tip_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_tip_confirmation_count
    AFTER INSERT OR DELETE ON tip_confirmations
    FOR EACH ROW
    EXECUTE FUNCTION update_tip_confirmation_count();
