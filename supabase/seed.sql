-- ============================================================
-- Nachbar.io — Seed-Daten für Pilotquartier Bad Säckingen
-- ============================================================
--
-- Dieses Skript erzeugt realistische Testdaten für die
-- Nachbar.io Community-App im Pilotquartier Bad Säckingen.
--
-- Abgedeckte Straßen:
--   - Purkersdorfer Straße (Hausnummern 1–14)
--   - Sanarystraße (Hausnummern 1–12)
--   - Oberer Rebberg (Hausnummern 1–10)
--
-- Geo-Zentrum: 47.5617° N, 7.9483° E
--
-- HINWEIS ZU SUPABASE AUTH:
-- Die users-Tabelle verwendet UUIDs, die normalerweise von
-- Supabase Auth (auth.users) vergeben werden. In dieser
-- Seed-Datei verwenden wir feste UUIDs im Format
-- 'a0000000-0000-0000-0000-000000000001' bis '...020',
-- damit Fremdschlüssel-Beziehungen korrekt aufgelöst werden.
--
-- Für den produktiven Betrieb müssen echte Supabase-Auth-
-- Accounts erstellt werden. Die hier verwendeten Test-UUIDs
-- können dann durch die echten auth.uid()-Werte ersetzt werden.
--
-- Ausführung: supabase db reset (lädt Migrationen + Seed)
-- ============================================================

-- Alte Testdaten entfernen (idempotent)
TRUNCATE
    notifications,
    alert_responses,
    alerts,
    help_responses,
    help_requests,
    marketplace_items,
    lost_found,
    skills,
    senior_checkins,
    push_subscriptions,
    community_rules_violations,
    news_items,
    household_members,
    users,
    households
CASCADE;

-- ============================================================
-- 1. HAUSHALTE
-- ============================================================

-- Purkersdorfer Straße (14 Häuser)
-- Verläuft von West nach Ost, nördlichste Straße im Quartier
INSERT INTO households (id, street_name, house_number, lat, lng, verified, invite_code) VALUES
('b0000000-0000-0000-0000-000000000001', 'Purkersdorfer Straße', '1',  47.56280, 7.94520, true,  'PKD001'),
('b0000000-0000-0000-0000-000000000002', 'Purkersdorfer Straße', '2',  47.56285, 7.94560, true,  'PKD002'),
('b0000000-0000-0000-0000-000000000003', 'Purkersdorfer Straße', '3',  47.56295, 7.94610, true,  'PKD003'),
('b0000000-0000-0000-0000-000000000004', 'Purkersdorfer Straße', '4',  47.56300, 7.94660, true,  'PKD004'),
('b0000000-0000-0000-0000-000000000005', 'Purkersdorfer Straße', '5',  47.56310, 7.94710, true,  'PKD005'),
('b0000000-0000-0000-0000-000000000006', 'Purkersdorfer Straße', '6',  47.56315, 7.94760, true,  'PKD006'),
('b0000000-0000-0000-0000-000000000007', 'Purkersdorfer Straße', '7',  47.56325, 7.94810, true,  'PKD007'),
('b0000000-0000-0000-0000-000000000008', 'Purkersdorfer Straße', '8',  47.56330, 7.94860, true,  'PKD008'),
('b0000000-0000-0000-0000-000000000009', 'Purkersdorfer Straße', '9',  47.56335, 7.94910, true,  'PKD009'),
('b0000000-0000-0000-0000-000000000010', 'Purkersdorfer Straße', '10', 47.56338, 7.94960, true,  'PKD010'),
('b0000000-0000-0000-0000-000000000011', 'Purkersdorfer Straße', '11', 47.56340, 7.95010, true,  'PKD011'),
('b0000000-0000-0000-0000-000000000012', 'Purkersdorfer Straße', '12', 47.56338, 7.95060, true,  'PKD012'),
('b0000000-0000-0000-0000-000000000013', 'Purkersdorfer Straße', '13', 47.56335, 7.95110, true,  'PKD013'),
('b0000000-0000-0000-0000-000000000014', 'Purkersdorfer Straße', '14', 47.56330, 7.95160, true,  'PKD014');

-- Sanarystraße (12 Häuser)
-- Mittlere Straße, ~100m südlich der Purkersdorfer
INSERT INTO households (id, street_name, house_number, lat, lng, verified, invite_code) VALUES
('b0000000-0000-0000-0000-000000000015', 'Sanarystraße', '1',  47.56170, 7.94550, true,  'SAN001'),
('b0000000-0000-0000-0000-000000000016', 'Sanarystraße', '2',  47.56175, 7.94600, true,  'SAN002'),
('b0000000-0000-0000-0000-000000000017', 'Sanarystraße', '3',  47.56182, 7.94660, true,  'SAN003'),
('b0000000-0000-0000-0000-000000000018', 'Sanarystraße', '4',  47.56188, 7.94720, true,  'SAN004'),
('b0000000-0000-0000-0000-000000000019', 'Sanarystraße', '5',  47.56192, 7.94780, true,  'SAN005'),
('b0000000-0000-0000-0000-000000000020', 'Sanarystraße', '6',  47.56195, 7.94840, true,  'SAN006'),
('b0000000-0000-0000-0000-000000000021', 'Sanarystraße', '7',  47.56198, 7.94900, true,  'SAN007'),
('b0000000-0000-0000-0000-000000000022', 'Sanarystraße', '8',  47.56200, 7.94960, true,  'SAN008'),
('b0000000-0000-0000-0000-000000000023', 'Sanarystraße', '9',  47.56198, 7.95020, true,  'SAN009'),
('b0000000-0000-0000-0000-000000000024', 'Sanarystraße', '10', 47.56195, 7.95080, true,  'SAN010'),
('b0000000-0000-0000-0000-000000000025', 'Sanarystraße', '11', 47.56190, 7.95140, true,  'SAN011'),
('b0000000-0000-0000-0000-000000000026', 'Sanarystraße', '12', 47.56185, 7.95200, true,  'SAN012');

-- Oberer Rebberg (10 Häuser)
-- Südlichste Straße, ~100m südlich der Sanarystraße, leichter Bogen
INSERT INTO households (id, street_name, house_number, lat, lng, verified, invite_code) VALUES
('b0000000-0000-0000-0000-000000000027', 'Oberer Rebberg', '1',  47.56050, 7.94620, true,  'ORB001'),
('b0000000-0000-0000-0000-000000000028', 'Oberer Rebberg', '2',  47.56045, 7.94690, true,  'ORB002'),
('b0000000-0000-0000-0000-000000000029', 'Oberer Rebberg', '3',  47.56040, 7.94760, true,  'ORB003'),
('b0000000-0000-0000-0000-000000000030', 'Oberer Rebberg', '4',  47.56035, 7.94830, true,  'ORB004'),
('b0000000-0000-0000-0000-000000000031', 'Oberer Rebberg', '5',  47.56032, 7.94900, true,  'ORB005'),
('b0000000-0000-0000-0000-000000000032', 'Oberer Rebberg', '6',  47.56030, 7.94970, true,  'ORB006'),
('b0000000-0000-0000-0000-000000000033', 'Oberer Rebberg', '7',  47.56032, 7.95040, true,  'ORB007'),
('b0000000-0000-0000-0000-000000000034', 'Oberer Rebberg', '8',  47.56035, 7.95110, true,  'ORB008'),
('b0000000-0000-0000-0000-000000000035', 'Oberer Rebberg', '9',  47.56040, 7.95180, true,  'ORB009'),
('b0000000-0000-0000-0000-000000000036', 'Oberer Rebberg', '10', 47.56048, 7.95250, false, 'ORB010');

-- ============================================================
-- 2. NUTZER (18 Personen)
-- ============================================================
-- UUIDs im Format a0...001 bis a0...018 für einfache Zuordnung.
-- In Produktion werden diese durch echte Supabase Auth UIDs ersetzt.
--
-- Rollen im Quartier:
--   - Thomas (001): Admin, Initiator des Pilotprojekts
--   - Heinrich (014), Ingrid (015), Gertrud (016): Senioren
--   - Lisa (017), Florian (018): Neue Nutzer (noch nicht verifiziert)

INSERT INTO users (id, email_hash, display_name, avatar_url, ui_mode, trust_level, is_admin, created_at, last_seen, settings) VALUES
-- Verifizierte aktive Nutzer
('a0000000-0000-0000-0000-000000000001', 'sha256_thomas',   'Thomas',   NULL, 'active', 'admin',    true,  now() - interval '60 days', now() - interval '1 hour',  '{"notifications": true, "radius": 3}'::jsonb),
('a0000000-0000-0000-0000-000000000002', 'sha256_maria',    'Maria',    NULL, 'active', 'trusted',  false, now() - interval '55 days', now() - interval '3 hours', '{"notifications": true, "radius": 2}'::jsonb),
('a0000000-0000-0000-0000-000000000003', 'sha256_stefan',   'Stefan',   NULL, 'active', 'trusted',  false, now() - interval '50 days', now() - interval '5 hours', '{"notifications": true, "radius": 2}'::jsonb),
('a0000000-0000-0000-0000-000000000004', 'sha256_claudia',  'Claudia',  NULL, 'active', 'verified', false, now() - interval '48 days', now() - interval '2 hours', '{"notifications": true, "radius": 1}'::jsonb),
('a0000000-0000-0000-0000-000000000005', 'sha256_markus',   'Markus',   NULL, 'active', 'verified', false, now() - interval '45 days', now() - interval '8 hours', '{"notifications": true, "radius": 2}'::jsonb),
('a0000000-0000-0000-0000-000000000006', 'sha256_anna',     'Anna',     NULL, 'active', 'trusted',  false, now() - interval '42 days', now() - interval '1 day',   '{"notifications": true, "radius": 2}'::jsonb),
('a0000000-0000-0000-0000-000000000007', 'sha256_peter',    'Peter',    NULL, 'active', 'verified', false, now() - interval '40 days', now() - interval '4 hours', '{"notifications": true, "radius": 1}'::jsonb),
('a0000000-0000-0000-0000-000000000008', 'sha256_sabine',   'Sabine',   NULL, 'active', 'verified', false, now() - interval '38 days', now() - interval '6 hours', '{"notifications": true, "radius": 2}'::jsonb),
('a0000000-0000-0000-0000-000000000009', 'sha256_michael',  'Michael',  NULL, 'active', 'trusted',  false, now() - interval '35 days', now() - interval '12 hours','{"notifications": true, "radius": 3}'::jsonb),
('a0000000-0000-0000-0000-000000000010', 'sha256_julia',    'Julia',    NULL, 'active', 'verified', false, now() - interval '30 days', now() - interval '2 days',  '{"notifications": true, "radius": 1}'::jsonb),
('a0000000-0000-0000-0000-000000000011', 'sha256_andreas',  'Andreas',  NULL, 'active', 'verified', false, now() - interval '28 days', now() - interval '1 day',   '{"notifications": true, "radius": 2}'::jsonb),
('a0000000-0000-0000-0000-000000000012', 'sha256_kathrin',  'Kathrin',  NULL, 'active', 'verified', false, now() - interval '25 days', now() - interval '3 days',  '{"notifications": true, "radius": 1}'::jsonb),
('a0000000-0000-0000-0000-000000000013', 'sha256_wolfgang', 'Wolfgang', NULL, 'active', 'verified', false, now() - interval '20 days', now() - interval '5 hours', '{"notifications": true, "radius": 2}'::jsonb),

-- Senioren (ui_mode = 'senior')
('a0000000-0000-0000-0000-000000000014', 'sha256_heinrich', 'Heinrich', NULL, 'senior', 'trusted',  false, now() - interval '58 days', now() - interval '6 hours', '{"notifications": true, "radius": 1, "font_size": "large"}'::jsonb),
('a0000000-0000-0000-0000-000000000015', 'sha256_ingrid',   'Ingrid',   NULL, 'senior', 'verified', false, now() - interval '52 days', now() - interval '1 day',   '{"notifications": true, "radius": 1, "font_size": "large"}'::jsonb),
('a0000000-0000-0000-0000-000000000016', 'sha256_gertrud',  'Gertrud',  NULL, 'senior', 'verified', false, now() - interval '46 days', now() - interval '2 days',  '{"notifications": true, "radius": 1, "font_size": "large"}'::jsonb),

-- Neue Nutzer (noch nicht vollständig verifiziert)
('a0000000-0000-0000-0000-000000000017', 'sha256_lisa',     'Lisa',     NULL, 'active', 'new',      false, now() - interval '3 days',  now() - interval '1 day',   '{"notifications": true, "radius": 1}'::jsonb),
('a0000000-0000-0000-0000-000000000018', 'sha256_florian',  'Florian',  NULL, 'active', 'new',      false, now() - interval '1 day',   now() - interval '2 hours', '{"notifications": true, "radius": 1}'::jsonb);

-- ============================================================
-- 3. HAUSHALT-ZUORDNUNGEN
-- ============================================================
-- Jeder Nutzer wird einem Haushalt zugeordnet.
-- Senioren und neue Nutzer sind auf verschiedene Straßen verteilt.

INSERT INTO household_members (household_id, user_id, role, verified_at, created_at) VALUES
-- Purkersdorfer Straße
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'owner',  now() - interval '60 days', now() - interval '60 days'),  -- Thomas, PKD 1
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'owner',  now() - interval '55 days', now() - interval '55 days'),  -- Maria, PKD 3
('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 'owner',  now() - interval '50 days', now() - interval '50 days'),  -- Stefan, PKD 5
('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000004', 'owner',  now() - interval '48 days', now() - interval '48 days'),  -- Claudia, PKD 7
('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000014', 'owner',  now() - interval '58 days', now() - interval '58 days'),  -- Heinrich (Senior), PKD 9
('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000005', 'owner',  now() - interval '45 days', now() - interval '45 days'),  -- Markus, PKD 11
('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000017', 'member', NULL,                        now() - interval '3 days'),   -- Lisa (neu), PKD 13

-- Sanarystraße
('b0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000006', 'owner',  now() - interval '42 days', now() - interval '42 days'),  -- Anna, SAN 1
('b0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000007', 'owner',  now() - interval '40 days', now() - interval '40 days'),  -- Peter, SAN 3
('b0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000008', 'owner',  now() - interval '38 days', now() - interval '38 days'),  -- Sabine, SAN 5
('b0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000009', 'owner',  now() - interval '35 days', now() - interval '35 days'),  -- Michael, SAN 7
('b0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000015', 'owner',  now() - interval '52 days', now() - interval '52 days'),  -- Ingrid (Senior), SAN 9
('b0000000-0000-0000-0000-000000000025', 'a0000000-0000-0000-0000-000000000010', 'owner',  now() - interval '30 days', now() - interval '30 days'),  -- Julia, SAN 11

-- Oberer Rebberg
('b0000000-0000-0000-0000-000000000027', 'a0000000-0000-0000-0000-000000000011', 'owner',  now() - interval '28 days', now() - interval '28 days'),  -- Andreas, ORB 1
('b0000000-0000-0000-0000-000000000029', 'a0000000-0000-0000-0000-000000000012', 'owner',  now() - interval '25 days', now() - interval '25 days'),  -- Kathrin, ORB 3
('b0000000-0000-0000-0000-000000000031', 'a0000000-0000-0000-0000-000000000016', 'owner',  now() - interval '46 days', now() - interval '46 days'),  -- Gertrud (Senior), ORB 5
('b0000000-0000-0000-0000-000000000033', 'a0000000-0000-0000-0000-000000000013', 'owner',  now() - interval '20 days', now() - interval '20 days'),  -- Wolfgang, ORB 7
('b0000000-0000-0000-0000-000000000035', 'a0000000-0000-0000-0000-000000000018', 'member', NULL,                        now() - interval '1 day');    -- Florian (neu), ORB 9

-- ============================================================
-- 4. ALERTS (Soforthilfe-Meldungen)
-- ============================================================

-- Alert 1: Wasserrohrbruch (offen, dringend)
INSERT INTO alerts (id, user_id, household_id, category, title, description, status, is_emergency, current_radius, created_at) VALUES
('c0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000007',  -- Peter
 'b0000000-0000-0000-0000-000000000017',  -- SAN 3
 'water_damage',
 'Wasserrohrbruch im Keller',
 'In unserem Keller steht Wasser. Der Haupthahn ist bereits abgedreht. Wir benötigen dringend Hilfe beim Abpumpen. Haben Sie zufällig eine Tauchpumpe?',
 'open',
 false,
 2,
 now() - interval '3 hours');

-- Alert 2: Stromausfall (Hilfe kommt)
INSERT INTO alerts (id, user_id, household_id, category, title, description, status, is_emergency, current_radius, created_at) VALUES
('c0000000-0000-0000-0000-000000000002',
 'a0000000-0000-0000-0000-000000000014',  -- Heinrich (Senior)
 'b0000000-0000-0000-0000-000000000009',  -- PKD 9
 'power_outage',
 'Strom ausgefallen seit heute Morgen',
 'Seit ca. 8 Uhr heute Morgen haben wir keinen Strom mehr. Sicherungen sind alle in Ordnung. Ist bei Ihnen auch der Strom weg?',
 'help_coming',
 false,
 1,
 now() - interval '6 hours');

-- Alert 3: Technische Hilfe für Senior (offen)
INSERT INTO alerts (id, user_id, household_id, category, title, description, status, is_emergency, current_radius, created_at) VALUES
('c0000000-0000-0000-0000-000000000003',
 'a0000000-0000-0000-0000-000000000015',  -- Ingrid (Senior)
 'b0000000-0000-0000-0000-000000000023',  -- SAN 9
 'tech_help',
 'Fernseher zeigt kein Bild mehr',
 'Mein Fernseher zeigt seit gestern Abend nur noch einen schwarzen Bildschirm. Könnte sich jemand das bitte ansehen? Ich kenne mich mit der Technik leider nicht so gut aus.',
 'open',
 false,
 1,
 now() - interval '18 hours');

-- Alert 4: Tür zugefallen (Hilfe kommt)
INSERT INTO alerts (id, user_id, household_id, category, title, description, status, is_emergency, current_radius, created_at) VALUES
('c0000000-0000-0000-0000-000000000004',
 'a0000000-0000-0000-0000-000000000004',  -- Claudia
 'b0000000-0000-0000-0000-000000000007',  -- PKD 7
 'door_lock',
 'Schlüssel in der Wohnung vergessen',
 'Mir ist die Tür zugefallen und der Schlüssel liegt drinnen. Hat jemand vielleicht den Kontakt eines günstigen Schlüsseldienstes? Der Ersatzschlüssel ist leider bei meiner Schwester in Freiburg.',
 'help_coming',
 false,
 1,
 now() - interval '2 hours');

-- ============================================================
-- 5. ALERT-ANTWORTEN
-- ============================================================

-- Antworten auf Wasserrohrbruch (Alert 1)
INSERT INTO alert_responses (alert_id, responder_user_id, message, response_type, created_at) VALUES
('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003',
 'Ich habe eine Tauchpumpe in der Garage. Bin in 10 Minuten bei Ihnen.', 'help',
 now() - interval '2 hours' - interval '30 minutes'),
('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000009',
 'Bei uns in der Sanarystraße 7 ist alles trocken. Könnte ein lokales Problem bei Ihnen sein. Soll ich den Installateur Müller anrufen? Der ist schnell und zuverlässig.', 'info',
 now() - interval '2 hours');

-- Antworten auf Stromausfall (Alert 2)
INSERT INTO alert_responses (alert_id, responder_user_id, message, response_type, created_at) VALUES
('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
 'Heinrich, ich schaue mir das gleich an. Bei uns in Nr. 1 ist der Strom da. Ich bringe ein Verlängerungskabel mit, falls Sie überbrücken müssen.', 'help',
 now() - interval '5 hours'),
('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005',
 'Habe gerade die Stadtwerke angerufen. Die wissen von nichts, es ist also kein großflächiger Ausfall. Wahrscheinlich ein Problem an der Hausverteilung.', 'info',
 now() - interval '4 hours');

-- Antwort auf Tür zugefallen (Alert 4)
INSERT INTO alert_responses (alert_id, responder_user_id, message, response_type, created_at) VALUES
('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002',
 'Claudia, ich habe die Nummer vom Schlüsseldienst Huber in Wallbach. Die sind fair und kommen schnell. Ich schicke Ihnen die Nummer per Nachricht. Soll ich vorbeikommen?', 'help',
 now() - interval '1 hour' - interval '30 minutes');

-- ============================================================
-- 6. HILFE-BÖRSE
-- ============================================================

-- Hilfe-Angebot 1: Einkaufshilfe
INSERT INTO help_requests (id, user_id, type, category, title, description, status, expires_at, created_at) VALUES
('d0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000006',  -- Anna
 'offer', 'shopping',
 'Fahre Samstag zum Kaufland — kann etwas mitbringen',
 'Ich fahre am Samstag Vormittag zum Kaufland nach Murg. Falls jemand etwas Schweres braucht (Getränkekisten, Waschmittel etc.), nehme ich das gerne mit. Bitte bis Freitag Abend melden.',
 'active',
 now() + interval '3 days',
 now() - interval '1 day');

-- Hilfe-Bedarf 2: Gartenarbeit
INSERT INTO help_requests (id, user_id, type, category, title, description, status, expires_at, created_at) VALUES
('d0000000-0000-0000-0000-000000000002',
 'a0000000-0000-0000-0000-000000000016',  -- Gertrud (Senior)
 'need', 'garden',
 'Hecke muss dringend geschnitten werden',
 'Meine Thujahecke ist stark gewachsen und ragt auf den Gehweg. Ich schaffe das leider alleine nicht mehr. Haben Sie vielleicht eine elektrische Heckenschere und könnten mir helfen? Kaffee und Kuchen sind selbstverständlich inklusive.',
 'active',
 now() + interval '7 days',
 now() - interval '2 days');

-- Hilfe-Angebot 3: Kinderbetreuung
INSERT INTO help_requests (id, user_id, type, category, title, description, status, expires_at, created_at) VALUES
('d0000000-0000-0000-0000-000000000003',
 'a0000000-0000-0000-0000-000000000008',  -- Sabine
 'offer', 'childcare',
 'Kann nachmittags auf Kinder aufpassen',
 'Ich bin Erzieherin und habe dienstags und donnerstags nachmittags frei. Falls jemand kurzfristig eine Betreuung für Kinder ab 3 Jahren braucht, helfe ich gerne aus.',
 'active',
 now() + interval '14 days',
 now() - interval '5 days');

-- Hilfe-Bedarf 4: Transport zum Arzt
INSERT INTO help_requests (id, user_id, type, category, title, description, status, expires_at, created_at) VALUES
('d0000000-0000-0000-0000-000000000004',
 'a0000000-0000-0000-0000-000000000014',  -- Heinrich (Senior)
 'need', 'transport',
 'Fahrt zum Augenarzt am Mittwoch',
 'Ich habe am Mittwoch um 10:00 Uhr einen Termin beim Augenarzt Dr. Keller in der Innenstadt. Leider bekomme ich Tropfen und darf danach nicht selbst fahren. Könnte mich jemand hinfahren und wieder abholen?',
 'active',
 now() + interval '5 days',
 now() - interval '1 day');

-- Hilfe-Angebot 5: Technische Hilfe (abgeschlossen)
INSERT INTO help_requests (id, user_id, type, category, title, description, status, expires_at, created_at) VALUES
('d0000000-0000-0000-0000-000000000005',
 'a0000000-0000-0000-0000-000000000009',  -- Michael
 'offer', 'tech',
 'Helfe beim Einrichten von Smartphone und Tablet',
 'Ich arbeite in der IT und helfe gerne beim Einrichten von Handys, Tablets oder WLAN. Einfach melden, ich komme vorbei.',
 'closed',
 now() - interval '2 days',
 now() - interval '14 days');

-- Hilfe-Bedarf 6: Haustierbetreuung
INSERT INTO help_requests (id, user_id, type, category, title, description, status, expires_at, created_at) VALUES
('d0000000-0000-0000-0000-000000000006',
 'a0000000-0000-0000-0000-000000000012',  -- Kathrin
 'need', 'pet_care',
 'Katzenbetreuung für 4 Tage im März',
 'Wir fahren vom 15. bis 18. März weg und suchen jemanden, der unsere Katze (Mimi, sehr verschmust, Wohnungskatze) einmal täglich füttern und kurz nach ihr schauen könnte. Schlüssel wird vorher übergeben.',
 'active',
 now() + interval '10 days',
 now() - interval '3 days');

-- ============================================================
-- 7. MARKTPLATZ
-- ============================================================

-- Artikel 1: Verschenken — Kinderbücher
INSERT INTO marketplace_items (user_id, type, category, title, description, price, images, status, created_at) VALUES
('a0000000-0000-0000-0000-000000000002',  -- Maria
 'give', 'books',
 'Kinderbücher (ab 6 Jahre) abzugeben',
 'Unsere Kinder sind herausgewachsen. Ca. 25 Bücher, gut erhalten: Pettersson und Findus, Conni, Die drei ??? Kids, Gregs Tagebuch. Können jederzeit abgeholt werden.',
 NULL,
 ARRAY['kinderbuecher_01.jpg'],
 'active',
 now() - interval '4 days');

-- Artikel 2: Verkaufen — Werkbank
INSERT INTO marketplace_items (user_id, type, category, title, description, price, images, status, created_at) VALUES
('a0000000-0000-0000-0000-000000000011',  -- Andreas
 'sell', 'tools',
 'Werkbank mit Schraubstock',
 'Stabile Werkbank (120 x 60 cm) mit integriertem Schraubstock. Massivholzplatte, Metallgestell. Gut erhalten, nur leichte Gebrauchsspuren. Selbstabholung.',
 45.00,
 ARRAY['werkbank_01.jpg', 'werkbank_02.jpg'],
 'active',
 now() - interval '6 days');

-- Artikel 3: Verleihen — Dampfreiniger
INSERT INTO marketplace_items (user_id, type, category, title, description, price, images, status, created_at) VALUES
('a0000000-0000-0000-0000-000000000003',  -- Stefan
 'lend', 'household',
 'Kärcher Dampfreiniger zum Ausleihen',
 'Unser Kärcher SC 3 steht die meiste Zeit im Keller. Sie können ihn gerne für ein paar Tage ausleihen. Bitte vorher kurz melden.',
 NULL,
 ARRAY['kaercher_01.jpg'],
 'active',
 now() - interval '10 days');

-- Artikel 4: Suche — Fahrradanhänger
INSERT INTO marketplace_items (user_id, type, category, title, description, price, images, status, created_at) VALUES
('a0000000-0000-0000-0000-000000000004',  -- Claudia
 'search', 'kids',
 'Suche Fahrradanhänger für 2 Kinder',
 'Wir suchen einen gebrauchten Fahrradanhänger für 2 Kinder (z.B. Thule oder Croozer). Gerne auch zum Ausleihen für den Sommer. Zustand darf gebraucht sein.',
 NULL,
 '{}',
 'active',
 now() - interval '2 days');

-- Artikel 5: Verschenken — Pflanzentöpfe (reserviert)
INSERT INTO marketplace_items (user_id, type, category, title, description, price, images, status, created_at) VALUES
('a0000000-0000-0000-0000-000000000010',  -- Julia
 'give', 'plants',
 'Diverse Terracotta-Töpfe',
 'Ca. 10 Terracotta-Töpfe in verschiedenen Größen (12–30 cm Durchmesser). Normale Gebrauchsspuren. Stehen im Carport zur Abholung bereit.',
 NULL,
 ARRAY['toepfe_01.jpg'],
 'reserved',
 now() - interval '8 days');

-- ============================================================
-- 8. FUNDSACHEN / VERLORENES
-- ============================================================

-- Verloren 1: Schlüsselbund
INSERT INTO lost_found (user_id, type, category, title, description, location_hint, images, status, created_at) VALUES
('a0000000-0000-0000-0000-000000000005',  -- Markus
 'lost', 'keys',
 'Schlüsselbund mit rotem Anhänger verloren',
 'Gestern Abend vermutlich auf dem Weg vom Briefkasten nach Hause verloren. 3 Schlüssel an einem Ring, daran ein roter Lederhänger mit Initialien „M.B." Bitte melden Sie sich, falls Sie ihn gefunden haben.',
 'Purkersdorfer Straße, Höhe Nr. 9-11',
 '{}',
 'open',
 now() - interval '1 day');

-- Gefunden 2: Paket
INSERT INTO lost_found (user_id, type, category, title, description, location_hint, images, status, created_at) VALUES
('a0000000-0000-0000-0000-000000000006',  -- Anna
 'found', 'package',
 'Paket lag im Gebüsch',
 'Ein DHL-Paket lag heute Morgen im Gebüsch neben unserem Grundstück. Adresse ist leider durch Regen etwas unleserlich, aber es scheint für die Sanarystraße bestimmt zu sein. Liegt bei mir zur Abholung bereit.',
 'Sanarystraße, Nähe Nr. 1',
 '{}',
 'open',
 now() - interval '8 hours');

-- Verloren 3: Katze
INSERT INTO lost_found (user_id, type, category, title, description, location_hint, images, status, created_at) VALUES
('a0000000-0000-0000-0000-000000000013',  -- Wolfgang
 'lost', 'pet',
 'Kater Felix seit 2 Tagen vermisst',
 'Unser Kater Felix (schwarz-weiß, ca. 5 kg, sehr scheu gegenüber Fremden) ist seit Montagabend nicht nach Hause gekommen. Er hat ein blaues Halsband mit Glöckchen. Falls Sie ihn sehen, bitte nicht einfangen — er erschreckt schnell. Rufen Sie mich bitte an.',
 'Oberer Rebberg, Richtung Waldrand',
 ARRAY['kater_felix_01.jpg'],
 'open',
 now() - interval '2 days');

-- Gefunden 4: Brille (bereits aufgelöst)
INSERT INTO lost_found (user_id, type, category, title, description, location_hint, images, status, created_at, resolved_at) VALUES
('a0000000-0000-0000-0000-000000000009',  -- Michael
 'found', 'glasses',
 'Lesebrille auf der Bank gefunden',
 'Eine Lesebrille mit braunem Gestell lag auf der Sitzbank an der Ecke Sanarystraße/Purkersdorfer Straße. Habe sie mitgenommen.',
 'Ecke Sanarystraße / Purkersdorfer Straße',
 '{}',
 'resolved',
 now() - interval '5 days',
 now() - interval '4 days');

-- ============================================================
-- 9. LOKALE NACHRICHTEN
-- ============================================================

INSERT INTO news_items (source_url, original_title, ai_summary, category, relevance_score, published_at, created_at) VALUES
-- Infrastruktur
('https://www.bad-saeckingen.de/aktuelles/kanalarbeiten-2026',
 'Kanalarbeiten Sanarystraße ab Montag',
 'Ab Montag wird die Sanarystraße wegen Kanalarbeiten zwischen Hausnummer 4 und 8 halbseitig gesperrt. Die Arbeiten dauern voraussichtlich bis Freitag. Anwohner werden gebeten, ihre Fahrzeuge in dieser Zeit in der Purkersdorfer Straße zu parken.',
 'infrastructure', 9, now() - interval '1 day', now() - interval '1 day'),

-- Abfallentsorgung
('https://www.landkreis-waldshut.de/abfall/termine',
 'Gelber Sack: Nächste Abholung am Donnerstag',
 'Die nächste Abholung der Gelben Säcke im Bereich Oberer Rebberg und Sanarystraße findet am kommenden Donnerstag statt. Bitte stellen Sie die Säcke bis 6:30 Uhr an die Straße.',
 'waste', 8, now() - interval '2 days', now() - interval '2 days'),

-- Veranstaltungen
('https://www.bad-saeckingen.de/veranstaltungen/stadtfest-2026',
 'Stadtfest Bad Säckingen am 20.–22. Juni',
 'Das traditionelle Stadtfest findet vom 20. bis 22. Juni auf dem Münsterplatz und in der Altstadt statt. Am Samstagabend gibt es ein Feuerwerk am Rhein.',
 'events', 6, now() - interval '3 days', now() - interval '3 days'),

-- Verwaltung
('https://www.bad-saeckingen.de/rathaus/sprechstunden',
 'Neue Sprechzeiten im Bürgerbüro ab März',
 'Das Bürgerbüro Bad Säckingen hat ab März erweiterte Öffnungszeiten: Montag bis Freitag 8:00–12:00 Uhr und zusätzlich Dienstag und Donnerstag 14:00–17:00 Uhr.',
 'administration', 5, now() - interval '5 days', now() - interval '5 days'),

-- Wetter
('https://www.wetterwarnung.de/baden-wuerttemberg',
 'Unwetterwarnung: Starkregen am Wochenende möglich',
 'Der Deutsche Wetterdienst warnt vor möglichem Starkregen am Samstag und Sonntag im Hochrheingebiet. Es werden bis zu 40 l/m² in kurzer Zeit erwartet. Bitte sichern Sie lose Gegenstände auf Balkonen und Terrassen.',
 'weather', 8, now() - interval '4 hours', now() - interval '4 hours'),

-- Sonstiges
('https://www.suedkurier.de/bad-saeckingen/neuer-defibrillator',
 'Neuer Defibrillator am Rebberg-Spielplatz installiert',
 'Die Stadt Bad Säckingen hat am Spielplatz Oberer Rebberg einen öffentlichen Defibrillator (AED) installiert. Er befindet sich im wetterfesten Kasten an der Schutzhütte und ist rund um die Uhr zugänglich.',
 'other', 7, now() - interval '7 days', now() - interval '7 days');

-- ============================================================
-- 10. SKILLS (Experten-Profile)
-- ============================================================

INSERT INTO skills (user_id, category, description, is_public, created_at) VALUES
-- Thomas: IT-Kenntnisse
('a0000000-0000-0000-0000-000000000001', 'it',
 'Softwareentwickler. Helfe gerne bei Problemen mit Computer, WLAN, Smartphone oder Smart-Home-Geräten.',
 true, now() - interval '55 days'),

-- Maria: Medizinische Kenntnisse
('a0000000-0000-0000-0000-000000000002', 'medical',
 'Krankenschwester im Ruhestand. Kann bei kleineren Verletzungen und Gesundheitsfragen beraten. Kein Ersatz für den Arztbesuch.',
 true, now() - interval '50 days'),

-- Stefan: Handwerk / Elektrik
('a0000000-0000-0000-0000-000000000003', 'electrical',
 'Elektriker-Meister. Kann bei Problemen mit Steckdosen, Sicherungen und einfachen Elektroinstallationen helfen.',
 true, now() - interval '45 days'),
('a0000000-0000-0000-0000-000000000003', 'handwork',
 'Allgemeine Reparaturen im Haushalt (Wasserhähne, Türschlösser, Regale montieren).',
 true, now() - interval '45 days'),

-- Michael: Transport
('a0000000-0000-0000-0000-000000000009', 'transport',
 'Habe einen Transporter (VW T6). Kann bei Umzügen oder Möbeltransporten helfen. Am Wochenende meist verfügbar.',
 true, now() - interval '30 days'),

-- Sabine: Kinderbetreuung
('a0000000-0000-0000-0000-000000000008', 'childcare',
 'Ausgebildete Erzieherin. Flexible Kinderbetreuung für Kinder ab 3 Jahren, nachmittags.',
 true, now() - interval '35 days'),

-- Peter: Garten
('a0000000-0000-0000-0000-000000000007', 'garden',
 'Hobbygärtner mit Erfahrung. Beratung zu Obstbäumen, Hecken, Rasen. Habe Aufsitzmäher und Heckenschere.',
 true, now() - interval '38 days'),

-- Wolfgang: Kochen
('a0000000-0000-0000-0000-000000000013', 'cooking',
 'Koche leidenschaftlich gerne. Kann für ältere Nachbarn Mahlzeiten vorbereiten oder Kochtipps geben.',
 true, now() - interval '18 days'),

-- Andreas: Recht (nicht öffentlich)
('a0000000-0000-0000-0000-000000000011', 'legal',
 'Rechtsanwalt (Mietrecht). Keine Rechtsberatung, aber kann auf Beratungsstellen verweisen.',
 false, now() - interval '25 days');

-- ============================================================
-- 11. SENIOR CHECK-INS
-- ============================================================

INSERT INTO senior_checkins (user_id, checked_in_at, contact_person_name, contact_person_phone) VALUES
('a0000000-0000-0000-0000-000000000014', now() - interval '6 hours',  'Thomas Bauer',    '+49 7761 123456'),
('a0000000-0000-0000-0000-000000000014', now() - interval '30 hours', 'Thomas Bauer',    '+49 7761 123456'),
('a0000000-0000-0000-0000-000000000015', now() - interval '8 hours',  'Michael Wagner',  '+49 7761 234567'),
('a0000000-0000-0000-0000-000000000016', now() - interval '26 hours', 'Kathrin Schmitt',  '+49 7761 345678');

-- ============================================================
-- 12. BENACHRICHTIGUNGEN
-- ============================================================

-- Benachrichtigungen für verschiedene Nutzer
INSERT INTO notifications (user_id, type, title, body, reference_id, reference_type, read, created_at) VALUES
-- Peter bekommt Bescheid, dass Stefan beim Wasserrohrbruch hilft
('a0000000-0000-0000-0000-000000000007', 'alert_response',
 'Stefan möchte Ihnen helfen',
 'Stefan hat auf Ihre Meldung „Wasserrohrbruch im Keller" reagiert: Er bringt eine Tauchpumpe mit.',
 'c0000000-0000-0000-0000-000000000001', 'alert',
 false, now() - interval '2 hours' - interval '30 minutes'),

-- Heinrich bekommt Info zu seinem Stromausfall
('a0000000-0000-0000-0000-000000000014', 'alert_response',
 'Thomas kommt vorbei',
 'Thomas hat auf Ihre Meldung „Strom ausgefallen" reagiert und kommt mit einem Verlängerungskabel.',
 'c0000000-0000-0000-0000-000000000002', 'alert',
 true, now() - interval '5 hours'),

-- Gertrud bekommt Nachricht über neue Hilfe-Angebote
('a0000000-0000-0000-0000-000000000016', 'help_match',
 'Neues Hilfe-Angebot im Quartier',
 'Peter bietet Gartenarbeit an — passend zu Ihrer Anfrage „Hecke muss geschnitten werden".',
 'd0000000-0000-0000-0000-000000000002', 'help_request',
 false, now() - interval '1 day'),

-- Unwetterwarnung für alle (hier exemplarisch für 3 Nutzer)
('a0000000-0000-0000-0000-000000000001', 'news',
 'Unwetterwarnung am Wochenende',
 'Der DWD warnt vor Starkregen am Samstag/Sonntag. Bitte sichern Sie lose Gegenstände.',
 NULL, 'news',
 true, now() - interval '4 hours'),

('a0000000-0000-0000-0000-000000000014', 'news',
 'Unwetterwarnung am Wochenende',
 'Der DWD warnt vor Starkregen am Samstag/Sonntag. Bitte sichern Sie lose Gegenstände.',
 NULL, 'news',
 false, now() - interval '4 hours'),

('a0000000-0000-0000-0000-000000000006', 'news',
 'Unwetterwarnung am Wochenende',
 'Der DWD warnt vor Starkregen am Samstag/Sonntag. Bitte sichern Sie lose Gegenstände.',
 NULL, 'news',
 false, now() - interval '4 hours'),

-- Senior Check-in Erinnerung
('a0000000-0000-0000-0000-000000000016', 'checkin_reminder',
 'Täglicher Check-in',
 'Guten Morgen, Gertrud! Bitte bestätigen Sie kurz, dass bei Ihnen alles in Ordnung ist.',
 NULL, NULL,
 false, now() - interval '2 hours'),

-- System-Nachricht für neuen Nutzer
('a0000000-0000-0000-0000-000000000017', 'system',
 'Willkommen bei Nachbar.io',
 'Herzlich willkommen, Lisa! Ihr Konto wartet auf die Verifizierung durch einen Administrator. Sie werden benachrichtigt, sobald Sie freigeschaltet sind.',
 NULL, NULL,
 true, now() - interval '3 days'),

-- Marktplatz-Nachricht
('a0000000-0000-0000-0000-000000000010', 'marketplace',
 'Ihre Pflanzentöpfe wurden reserviert',
 'Maria hat Interesse an Ihren Terracotta-Töpfen und möchte sie abholen.',
 NULL, 'marketplace_item',
 true, now() - interval '2 days');

-- ============================================================
-- 13. HILFE-ANTWORTEN (help_responses, Migration 003)
-- ============================================================

INSERT INTO help_responses (help_request_id, responder_user_id, message, created_at) VALUES
-- Antwort auf Einkaufshilfe von Anna
('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000015',
 'Das wäre sehr nett! Ich bräuchte einen Kasten Mineralwasser und eine Packung Waschpulver. Kann ich Ihnen das Geld vorher vorbeibringen?',
 now() - interval '20 hours'),

-- Antwort auf Hecke schneiden für Gertrud
('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000007',
 'Gertrud, ich komme am Samstag Vormittag mit meiner Heckenschere vorbei. Dauert bestimmt nicht länger als eine Stunde.',
 now() - interval '1 day'),

-- Antwort auf Transport für Heinrich
('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000009',
 'Heinrich, das passt gut. Ich habe am Mittwoch Vormittag frei. Soll ich Sie um 9:30 Uhr abholen?',
 now() - interval '12 hours'),

-- Antwort auf Katzenbetreuung
('d0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000006',
 'Kathrin, ich passe gerne auf Mimi auf! Ich mag Katzen sehr. Wann kann ich den Schlüssel abholen?',
 now() - interval '2 days');

-- ============================================================
-- FERTIG — Zusammenfassung der Testdaten
-- ============================================================
-- Haushalte:     36 (14 + 12 + 10)
-- Nutzer:        18 (1 Admin, 13 verifiziert, 3 Senioren, 2 neu)
-- Zuordnungen:   18 (16 verifiziert, 2 ausstehend)
-- Alerts:         4 (2 offen, 2 Hilfe kommt)
-- Alert-Antw.:    5
-- Hilfe-Börse:    6 (5 aktiv, 1 geschlossen)
-- Hilfe-Antw.:    4
-- Marktplatz:     5 (4 aktiv, 1 reserviert)
-- Fundsachen:     4 (3 offen, 1 aufgelöst)
-- Nachrichten:    6
-- Skills:         9 (8 öffentlich, 1 privat)
-- Check-ins:      4
-- Benachricht.:   9
-- ============================================================
