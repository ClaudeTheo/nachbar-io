-- ============================================================
-- Nachbar.io — Migration 034: Quarters (Multi-Quartier)
-- Ermoeglicht mehrere Quartiere mit Geo-Koordinaten
-- ============================================================

CREATE TABLE IF NOT EXISTS quarters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    center_lat DOUBLE PRECISION NOT NULL,
    center_lng DOUBLE PRECISION NOT NULL,
    zoom_level INTEGER NOT NULL DEFAULT 17,
    bounds_sw_lat DOUBLE PRECISION NOT NULL,
    bounds_sw_lng DOUBLE PRECISION NOT NULL,
    bounds_ne_lat DOUBLE PRECISION NOT NULL,
    bounds_ne_lng DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE quarters ENABLE ROW LEVEL SECURITY;

-- Lesen: Alle verifizierten Mitglieder
CREATE POLICY quarters_read ON quarters
    FOR SELECT USING (is_verified_member());

-- Schreiben: Nur Admins
CREATE POLICY quarters_admin ON quarters
    FOR ALL USING (is_admin());

-- Pilotquartier einfuegen
INSERT INTO quarters (name, slug, center_lat, center_lng, zoom_level,
    bounds_sw_lat, bounds_sw_lng, bounds_ne_lat, bounds_ne_lng)
VALUES (
    'Bad Saeckingen — Purkersdorfer/Sanary/Rebberg',
    'bad-saeckingen-pilot',
    47.5535, 7.9640, 17,
    47.5500, 7.9580, 47.5570, 7.9710
);
