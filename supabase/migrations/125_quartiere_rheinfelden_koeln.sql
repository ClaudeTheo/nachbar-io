-- Migration 125: Quartiere Rheinfelden (Baden) + Koeln Altstadt
-- Inkl. Haushalte, map_houses, municipal_config

-- 1. Quartier Rheinfelden (Baden)
INSERT INTO quarters (
  id, name, slug, city, state, country,
  center_lat, center_lng, zoom_level,
  bounds_sw_lat, bounds_sw_lng, bounds_ne_lat, bounds_ne_lng,
  map_config, settings, max_households, status, invite_prefix,
  description, boundary
) VALUES (
  gen_random_uuid(),
  'Rheinfelden (Baden) — Zentrum',
  'rheinfelden-zentrum',
  'Rheinfelden (Baden)', 'Baden-Württemberg', 'Deutschland',
  47.5545, 7.7947, 17,
  47.5510, 7.7890, 47.5580, 7.8010,
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
  50, 'active', 'RHEIN',
  'Zentrum-Quartier Rheinfelden (Baden) — Testquartier',
  ST_GeogFromText('POLYGON((7.7890 47.5510, 7.8010 47.5510, 7.8010 47.5580, 7.7890 47.5580, 7.7890 47.5510))')
);

-- 2. Quartier Koeln Altstadt
INSERT INTO quarters (
  id, name, slug, city, state, country,
  center_lat, center_lng, zoom_level,
  bounds_sw_lat, bounds_sw_lng, bounds_ne_lat, bounds_ne_lng,
  map_config, settings, max_households, status, invite_prefix,
  description, boundary
) VALUES (
  gen_random_uuid(),
  'Köln — Altstadt',
  'koeln-altstadt',
  'Köln', 'Nordrhein-Westfalen', 'Deutschland',
  50.9375, 6.9603, 17,
  50.9340, 6.9550, 50.9410, 6.9660,
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
  50, 'active', 'KOELN',
  'Altstadt-Quartier Köln — Testquartier',
  ST_GeogFromText('POLYGON((6.9550 50.9340, 6.9660 50.9340, 6.9660 50.9410, 6.9550 50.9410, 6.9550 50.9340))')
);

-- 3. Map-Houses + Households fuer Rheinfelden
DO $$
DECLARE
  q_id UUID;
  hh_id UUID;
BEGIN
  SELECT id INTO q_id FROM quarters WHERE slug = 'rheinfelden-zentrum';

  -- Map-Houses
  INSERT INTO map_houses (id, house_number, street_code, x, y, default_color, lat, lng, quarter_id) VALUES
    ('rf-fs5',  '5',  'FS', 0, 0, 'green', 47.5548, 7.7935, q_id),
    ('rf-fs12', '12', 'FS', 0, 0, 'green', 47.5551, 7.7942, q_id),
    ('rf-kf3',  '3',  'KF', 0, 0, 'green', 47.5540, 7.7960, q_id),
    ('rf-ts8',  '8',  'TS', 0, 0, 'green', 47.5535, 7.7920, q_id);

  -- Households
  hh_id := gen_random_uuid();
  INSERT INTO households (id, street_name, house_number, lat, lng, verified, invite_code, quarter_id, map_house_id)
  VALUES (hh_id, 'Friedrichstraße', '5', 47.5548, 7.7935, true, 'RHEIN-TEST-FS05', q_id, 'rf-fs5');

  hh_id := gen_random_uuid();
  INSERT INTO households (id, street_name, house_number, lat, lng, verified, invite_code, quarter_id, map_house_id)
  VALUES (hh_id, 'Friedrichstraße', '12', 47.5551, 7.7942, true, 'RHEIN-TEST-FS12', q_id, 'rf-fs12');

  hh_id := gen_random_uuid();
  INSERT INTO households (id, street_name, house_number, lat, lng, verified, invite_code, quarter_id, map_house_id)
  VALUES (hh_id, 'Karl-Fürstenberg-Straße', '3', 47.5540, 7.7960, true, 'RHEIN-TEST-KF03', q_id, 'rf-kf3');

  hh_id := gen_random_uuid();
  INSERT INTO households (id, street_name, house_number, lat, lng, verified, invite_code, quarter_id, map_house_id)
  VALUES (hh_id, 'Tutti-Straße', '8', 47.5535, 7.7920, true, 'RHEIN-TEST-TS08', q_id, 'rf-ts8');
END $$;

-- 4. Map-Houses + Households fuer Koeln
DO $$
DECLARE
  q_id UUID;
  hh_id UUID;
BEGIN
  SELECT id INTO q_id FROM quarters WHERE slug = 'koeln-altstadt';

  -- Map-Houses
  INSERT INTO map_houses (id, house_number, street_code, x, y, default_color, lat, lng, quarter_id) VALUES
    ('kn-am20', '20', 'AM', 0, 0, 'green', 50.9380, 6.9610, q_id),
    ('kn-hm6',  '6',  'HM', 0, 0, 'green', 50.9368, 6.9615, q_id),
    ('kn-sg1',  '1',  'SG', 0, 0, 'green', 50.9385, 6.9595, q_id),
    ('kn-ab3',  '3',  'AB', 0, 0, 'green', 50.9372, 6.9580, q_id);

  -- Households
  hh_id := gen_random_uuid();
  INSERT INTO households (id, street_name, house_number, lat, lng, verified, invite_code, quarter_id, map_house_id)
  VALUES (hh_id, 'Alter Markt', '20', 50.9380, 6.9610, true, 'KOELN-TEST-AM20', q_id, 'kn-am20');

  hh_id := gen_random_uuid();
  INSERT INTO households (id, street_name, house_number, lat, lng, verified, invite_code, quarter_id, map_house_id)
  VALUES (hh_id, 'Heumarkt', '6', 50.9368, 6.9615, true, 'KOELN-TEST-HM06', q_id, 'kn-hm6');

  hh_id := gen_random_uuid();
  INSERT INTO households (id, street_name, house_number, lat, lng, verified, invite_code, quarter_id, map_house_id)
  VALUES (hh_id, 'Salzgasse', '1', 50.9385, 6.9595, true, 'KOELN-TEST-SG01', q_id, 'kn-sg1');

  hh_id := gen_random_uuid();
  INSERT INTO households (id, street_name, house_number, lat, lng, verified, invite_code, quarter_id, map_house_id)
  VALUES (hh_id, 'Am Bollwerk', '3', 50.9372, 6.9580, true, 'KOELN-TEST-AB03', q_id, 'kn-ab3');
END $$;

-- 5. Municipal-Config fuer Rheinfelden + Koeln
INSERT INTO municipal_config (id, quarter_id, city_name, state, rathaus_url, rathaus_phone, rathaus_email, features)
SELECT gen_random_uuid(), id, 'Rheinfelden (Baden)', 'Baden-Württemberg',
  'https://www.rheinfelden.de', '+49 7623 95-0', 'stadt@rheinfelden-baden.de',
  jsonb_build_object(
    'nina_ags', '083360049049',
    'nina_enabled', true,
    'waste_enabled', false,
    'events_enabled', true
  )
FROM quarters WHERE slug = 'rheinfelden-zentrum';

INSERT INTO municipal_config (id, quarter_id, city_name, state, rathaus_url, rathaus_phone, rathaus_email, features)
SELECT gen_random_uuid(), id, 'Köln', 'Nordrhein-Westfalen',
  'https://www.stadt-koeln.de', '+49 221 221-0', 'info@stadt-koeln.de',
  jsonb_build_object(
    'nina_ags', '053150000000',
    'nina_enabled', true,
    'waste_enabled', false,
    'events_enabled', true
  )
FROM quarters WHERE slug = 'koeln-altstadt';
