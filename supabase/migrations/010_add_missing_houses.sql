-- ============================================================
-- Nachbar.io — Migration 010: Fehlende Haeuser + Position-RLS
-- Ergaenzt fehlende Hausnummern laut Stadtdaten
-- Erlaubt Nutzern ihre eigene Position anzupassen
-- ============================================================

-- Fehlende Purkersdorfer Strasse (interpolierte Koordinaten)
INSERT INTO map_houses (id, house_number, street_code, x, y, default_color) VALUES
    ('ps13', '13', 'PS', 140, 241, 'green'),
    ('ps18', '18', 'PS', 790, 300, 'green'),
    ('ps21', '21', 'PS', 288, 218, 'green'),
    ('ps25', '25', 'PS', 380, 224, 'green'),
    ('ps27', '27', 'PS', 425, 230, 'green'),
    ('ps35', '35', 'PS', 550, 218, 'green'),
    ('ps43', '43', 'PS', 720, 130, 'green'),
    ('ps49', '49', 'PS', 800, 140, 'green'),
    ('ps51', '51', 'PS', 840, 130, 'green')
ON CONFLICT (id) DO NOTHING;

-- Fehlende Sanarystrasse (interpolierte Koordinaten)
INSERT INTO map_houses (id, house_number, street_code, x, y, default_color) VALUES
    ('sn2', '2', 'SN', 250, 380, 'green'),
    ('sn4', '4', 'SN', 350, 396, 'green'),
    ('sn6', '6', 'SN', 420, 405, 'green'),
    ('sn7', '7', 'SN', 460, 408, 'green'),
    ('sn8', '8', 'SN', 490, 412, 'green'),
    ('sn10', '10', 'SN', 560, 420, 'green'),
    ('sn11', '11', 'SN', 590, 415, 'green'),
    ('sn12', '12', 'SN', 650, 418, 'green'),
    ('sn14', '14', 'SN', 720, 420, 'green'),
    ('sn16', '16', 'SN', 750, 425, 'green'),
    ('sn18', '18', 'SN', 830, 440, 'green'),
    ('sn19', '19', 'SN', 880, 395, 'green')
ON CONFLICT (id) DO NOTHING;

-- RLS: Nutzer darf Position des eigenen Hauses anpassen
CREATE POLICY map_houses_own_position ON map_houses
    FOR UPDATE USING (
        is_verified_member()
        AND EXISTS (
            SELECT 1 FROM household_members hm
            JOIN households h ON h.id = hm.household_id
            WHERE hm.user_id = auth.uid()
                AND hm.verified_at IS NOT NULL
                AND h.street_name = CASE map_houses.street_code
                    WHEN 'PS' THEN 'Purkersdorfer Straße'
                    WHEN 'SN' THEN 'Sanarystraße'
                    WHEN 'OR' THEN 'Oberer Rebberg'
                END
                AND h.house_number = map_houses.house_number
        )
    ) WITH CHECK (
        is_verified_member()
        AND EXISTS (
            SELECT 1 FROM household_members hm
            JOIN households h ON h.id = hm.household_id
            WHERE hm.user_id = auth.uid()
                AND hm.verified_at IS NOT NULL
                AND h.street_name = CASE map_houses.street_code
                    WHEN 'PS' THEN 'Purkersdorfer Straße'
                    WHEN 'SN' THEN 'Sanarystraße'
                    WHEN 'OR' THEN 'Oberer Rebberg'
                END
                AND h.house_number = map_houses.house_number
        )
    );
