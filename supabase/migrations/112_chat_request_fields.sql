-- ============================================================
-- Nachbar.io — Migration 112: Chat-Anfrage-Felder
-- Erweitert neighbor_connections um target_household_id
-- fuer Anfragen an unbekannte Haushalte (Schwarzes Brett)
-- ============================================================

-- Neue Spalte: Ziel-Haushalt (optional, fuer Anfragen ohne bekannten Nutzer)
ALTER TABLE neighbor_connections
    ADD COLUMN IF NOT EXISTS target_household_id UUID REFERENCES households(id);

-- Index: Offene Anfragen eines Nutzers schnell finden
CREATE INDEX IF NOT EXISTS idx_neighbor_connections_requester_pending
    ON neighbor_connections(requester_id)
    WHERE status = 'pending';

-- Index: Anfragen an einen bestimmten Haushalt
CREATE INDEX IF NOT EXISTS idx_neighbor_connections_target_household
    ON neighbor_connections(target_household_id)
    WHERE target_household_id IS NOT NULL;
