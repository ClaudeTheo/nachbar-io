-- Migration 081: Quartier Laufenburg — Testquartier mit Leaflet-Karte
-- Inkl. Constraint-Erweiterung fuer Multi-Quartier

-- 1. Constraints fuer Multi-Quartier erweitern (Legacy war SVG-only)
ALTER TABLE map_houses DROP CONSTRAINT IF EXISTS map_houses_street_code_check;
ALTER TABLE map_houses DROP CONSTRAINT IF EXISTS map_houses_x_check;
ALTER TABLE map_houses DROP CONSTRAINT IF EXISTS map_houses_y_check;
ALTER TABLE map_houses ADD CONSTRAINT map_houses_x_check CHECK (x >= 0);
ALTER TABLE map_houses ADD CONSTRAINT map_houses_y_check CHECK (y >= 0);

-- 2. Quartier anlegen (mit Boundary direkt)
INSERT INTO quarters (
  id, name, slug, city, state, country,
  center_lat, center_lng, zoom_level,
  bounds_sw_lat, bounds_sw_lng, bounds_ne_lat, bounds_ne_lng,
  map_config, settings, max_households, status, invite_prefix,
  description, boundary
) VALUES (
  gen_random_uuid(),
  'Laufenburg (Baden) — Altstadt',
  'laufenburg-altstadt',
  'Laufenburg (Baden)', 'Baden-Württemberg', 'Deutschland',
  47.5670, 8.0640, 17,
  47.5640, 8.0590, 47.5700, 8.0700,
  jsonb_build_object(
    'type', 'leaflet',
    'tileUrl', 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
  ),
  jsonb_build_object(
    'allowSelfRegistration', false,
    'requireVerification', true,
    'enableCareModule', true,
    'enableMarketplace', true,
    'enableEvents', true,
    'enablePolls', true,
    'emergencyBannerEnabled', true
  ),
  50, 'active', 'LAUF',
  'Altstadt-Quartier Laufenburg (Baden) — Pilotquartier fuer Leaflet-Karten',
  ST_GeogFromText('POLYGON((8.0590 47.5640, 8.0700 47.5640, 8.0700 47.5700, 8.0590 47.5700, 8.0590 47.5640))')
);

-- 3. Bad Saeckingen Boundary nachtraeglich setzen (Legacy)
UPDATE quarters
SET boundary = ST_GeogFromText(
  'POLYGON((7.9580 47.5490, 7.9700 47.5490, 7.9700 47.5580, 7.9580 47.5580, 7.9580 47.5490))'
)
WHERE slug = 'bad-saeckingen-pilot' AND boundary IS NULL;

-- 4. Haeuser fuer Laufenburg (8 Haeuser, 3 Strassen)
DO $$
DECLARE
  lauf_id UUID;
BEGIN
  SELECT id INTO lauf_id FROM quarters WHERE slug = 'laufenburg-altstadt';

  -- Hauptstrasse (HS)
  INSERT INTO map_houses (id, house_number, street_code, x, y, default_color, lat, lng, quarter_id)
  VALUES
    ('hs5',  '5',  'HS', 0, 0, 'green', 47.5668, 8.0632, lauf_id),
    ('hs12', '12', 'HS', 0, 0, 'green', 47.5670, 8.0638, lauf_id),
    ('hs18', '18', 'HS', 0, 0, 'green', 47.5671, 8.0645, lauf_id),
    ('hs24', '24', 'HS', 0, 0, 'green', 47.5673, 8.0650, lauf_id);

  -- Marktgasse (MG)
  INSERT INTO map_houses (id, house_number, street_code, x, y, default_color, lat, lng, quarter_id)
  VALUES
    ('mg3', '3', 'MG', 0, 0, 'green', 47.5669, 8.0625, lauf_id),
    ('mg7', '7', 'MG', 0, 0, 'green', 47.5671, 8.0630, lauf_id);

  -- Codmanstrasse (CS)
  INSERT INTO map_houses (id, house_number, street_code, x, y, default_color, lat, lng, quarter_id)
  VALUES
    ('cs2', '2', 'CS', 0, 0, 'green', 47.5663, 8.0645, lauf_id),
    ('cs8', '8', 'CS', 0, 0, 'green', 47.5666, 8.0655, lauf_id);
END $$;

-- 5. Households + Invite-Codes fuer Laufenburg
DO $$
DECLARE
  lauf_id UUID;
  house RECORD;
  street_name_full TEXT;
  new_household_id UUID;
  invite TEXT;
BEGIN
  SELECT id INTO lauf_id FROM quarters WHERE slug = 'laufenburg-altstadt';

  FOR house IN
    SELECT id, house_number, street_code, lat, lng
    FROM map_houses
    WHERE quarter_id = lauf_id
    ORDER BY street_code, house_number
  LOOP
    CASE house.street_code
      WHEN 'HS' THEN street_name_full := 'Hauptstraße';
      WHEN 'MG' THEN street_name_full := 'Marktgasse';
      WHEN 'CS' THEN street_name_full := 'Codmanstraße';
      ELSE street_name_full := house.street_code;
    END CASE;

    invite := 'LAUF' || upper(substr(md5(random()::text), 1, 4)) || upper(substr(md5(random()::text), 1, 4));

    new_household_id := gen_random_uuid();
    INSERT INTO households (id, street_name, house_number, lat, lng, verified, invite_code, quarter_id, map_house_id)
    VALUES (
      new_household_id,
      street_name_full,
      house.house_number,
      house.lat,
      house.lng,
      false,
      invite,
      lauf_id,
      house.id
    );
  END LOOP;
END $$;
