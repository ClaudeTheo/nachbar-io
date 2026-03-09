-- ============================================================
-- Nachbar.io — Migration 007: Karten-Haeuser Konfiguration
-- Speichert Haus-Positionen fuer die interaktive SVG-Karte
-- ============================================================

CREATE TABLE IF NOT EXISTS map_houses (
    id TEXT PRIMARY KEY,
    house_number TEXT NOT NULL,
    street_code TEXT NOT NULL CHECK (street_code IN ('PS', 'SN', 'OR')),
    x INTEGER NOT NULL CHECK (x >= 0 AND x <= 1083),
    y INTEGER NOT NULL CHECK (y >= 0 AND y <= 766),
    default_color TEXT NOT NULL DEFAULT 'green' CHECK (default_color IN ('green', 'red', 'yellow')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_map_houses_street ON map_houses(street_code);

-- RLS
ALTER TABLE map_houses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "map_houses_read" ON map_houses
    FOR SELECT USING (is_verified_member());

CREATE POLICY "map_houses_admin_insert" ON map_houses
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "map_houses_admin_update" ON map_houses
    FOR UPDATE USING (is_admin());

CREATE POLICY "map_houses_admin_delete" ON map_houses
    FOR DELETE USING (is_admin());

-- updated_at Trigger
CREATE OR REPLACE FUNCTION update_map_houses_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER map_houses_updated_at
    BEFORE UPDATE ON map_houses
    FOR EACH ROW
    EXECUTE FUNCTION update_map_houses_timestamp();

-- Seed: Alle 76 Haeuser aus NachbarKarte.tsx
INSERT INTO map_houses (id, house_number, street_code, x, y, default_color) VALUES
    ('ps11', '11', 'PS', 67, 251, 'green'),
    ('ps17', '17', 'PS', 212, 231, 'green'),
    ('ps19', '19', 'PS', 241, 224, 'green'),
    ('ps23', '23', 'PS', 332, 213, 'green'),
    ('ps29', '29', 'PS', 463, 235, 'green'),
    ('ps31', '31', 'PS', 489, 230, 'green'),
    ('ps33', '33', 'PS', 518, 223, 'green'),
    ('ps37', '37', 'PS', 588, 212, 'green'),
    ('ps39', '39', 'PS', 627, 226, 'green'),
    ('ps41', '41', 'PS', 687, 226, 'green'),
    ('ps45', '45', 'PS', 649, 124, 'green'),
    ('ps47', '47', 'PS', 727, 226, 'green'),
    ('ps55', '55', 'PS', 887, 116, 'green'),
    ('ps59', '59', 'PS', 876, 159, 'green'),
    ('ps22', '22', 'PS', 919, 219, 'green'),
    ('ps24', '24', 'PS', 970, 206, 'green'),
    ('ps32', '32', 'PS', 1028, 97, 'green'),
    ('ps34', '34', 'PS', 1046, 54, 'green'),
    ('ps20', '20', 'PS', 960, 324, 'green'),
    ('ps9', '9', 'PS', 84, 334, 'green'),
    ('ps7', '7', 'PS', 117, 341, 'green'),
    ('ps5', '5', 'PS', 143, 330, 'green'),
    ('ps3', '3', 'PS', 210, 341, 'green'),
    ('ps1', '1', 'PS', 173, 369, 'green'),
    ('ps2', '2', 'PS', 194, 285, 'green'),
    ('ps4', '4', 'PS', 261, 338, 'green'),
    ('ps8', '8', 'PS', 434, 337, 'green'),
    ('ps10', '10', 'PS', 478, 337, 'green'),
    ('ps4b', '4b', 'PS', 358, 299, 'green'),
    ('ps6', '6', 'PS', 431, 306, 'green'),
    ('ps12', '12', 'PS', 676, 305, 'green'),
    ('ps14', '14', 'PS', 545, 280, 'green'),
    ('sn21', '21', 'SN', 851, 378, 'green'),
    ('sn21b', '21b', 'SN', 909, 353, 'green'),
    ('sn23', '23', 'SN', 982, 373, 'green'),
    ('sn24', '24', 'SN', 991, 305, 'green'),
    ('sn27', '27', 'SN', 1022, 520, 'green'),
    ('sn1', '1', 'SN', 318, 394, 'green'),
    ('sn3', '3', 'SN', 195, 367, 'green'),
    ('sn5', '5', 'SN', 383, 399, 'green'),
    ('sn9', '9', 'SN', 526, 417, 'green'),
    ('sn13', '13', 'SN', 620, 412, 'green'),
    ('sn15', '15', 'SN', 683, 416, 'green'),
    ('sn17', '17', 'SN', 802, 402, 'green'),
    ('sn20', '20', 'SN', 862, 462, 'green'),
    ('sn22', '22', 'SN', 942, 465, 'green'),
    ('or2a', '2a', 'OR', 146, 509, 'green'),
    ('or4', '4', 'OR', 252, 470, 'green'),
    ('or6', '6', 'OR', 330, 466, 'green'),
    ('or8', '8', 'OR', 390, 467, 'green'),
    ('or10', '10', 'OR', 458, 470, 'green'),
    ('or12', '12', 'OR', 524, 470, 'green'),
    ('or14', '14', 'OR', 597, 471, 'green'),
    ('or16', '16', 'OR', 666, 471, 'green'),
    ('or18', '18', 'OR', 747, 469, 'green'),
    ('or20', '20', 'OR', 862, 451, 'green'),
    ('or22a', '22a', 'OR', 940, 450, 'green'),
    ('or5', '5', 'OR', 199, 563, 'green'),
    ('or7', '7', 'OR', 290, 580, 'green'),
    ('or9', '9', 'OR', 377, 584, 'green'),
    ('or11', '11', 'OR', 431, 582, 'green'),
    ('or13', '13', 'OR', 551, 613, 'green'),
    ('or1517', '15-17', 'OR', 637, 584, 'green'),
    ('or22b', '22b', 'OR', 760, 596, 'green'),
    ('or23', '23', 'OR', 919, 573, 'green'),
    ('or2b', '2b', 'OR', 960, 435, 'green'),
    ('or10b', '10b', 'OR', 199, 632, 'green'),
    ('or12b', '12b', 'OR', 285, 668, 'green'),
    ('or14b', '14b', 'OR', 394, 678, 'green'),
    ('or16b', '16b', 'OR', 484, 681, 'green'),
    ('or18b', '18b', 'OR', 539, 682, 'green'),
    ('or20b', '20b', 'OR', 613, 681, 'green'),
    ('or22c', '22c', 'OR', 673, 677, 'green'),
    ('or24_26', '24-26', 'OR', 893, 661, 'green'),
    ('or28', '28', 'OR', 980, 553, 'green')
ON CONFLICT (id) DO NOTHING;
