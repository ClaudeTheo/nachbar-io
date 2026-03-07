-- ============================================================
-- Nachbar.io — Seed-Daten für Pilotquartier Bad Säckingen
-- Koordinaten basierend auf realer Karte des Quartiers
-- Purkersdorfer Str. / Sanarystraße / Oberer Rebberg
-- ============================================================

-- Haushalte: Purkersdorfer Straße (10 Häuser)
-- Nördlichste Straße, verläuft von W nach E mit leichter Kurve
-- Quartier-Mitte vom Nutzer: 47°33'42.1"N, 7°56'53.7"E = 47.5617, 7.9483
INSERT INTO households (street_name, house_number, lat, lng, verified, invite_code) VALUES
('Purkersdorfer Straße', '1',  47.56300, 7.94560, true, 'PURK0001'),
('Purkersdorfer Straße', '3',  47.56315, 7.94620, true, 'PURK0003'),
('Purkersdorfer Straße', '5',  47.56330, 7.94690, true, 'PURK0005'),
('Purkersdorfer Straße', '7',  47.56340, 7.94760, true, 'PURK0007'),
('Purkersdorfer Straße', '9',  47.56348, 7.94830, true, 'PURK0009'),
('Purkersdorfer Straße', '11', 47.56350, 7.94900, true, 'PURK0011'),
('Purkersdorfer Straße', '13', 47.56348, 7.94970, true, 'PURK0013'),
('Purkersdorfer Straße', '15', 47.56340, 7.95040, true, 'PURK0015'),
('Purkersdorfer Straße', '17', 47.56325, 7.95110, true, 'PURK0017'),
('Purkersdorfer Straße', '19', 47.56305, 7.95170, true, 'PURK0019');

-- Haushalte: Sanarystraße (10 Häuser)
-- Mittlere Straße, ~120m südlich der Purkersdorfer, verläuft W→E
INSERT INTO households (street_name, house_number, lat, lng, verified, invite_code) VALUES
('Sanarystraße', '2',  47.56170, 7.94580, true, 'SANA0002'),
('Sanarystraße', '4',  47.56180, 7.94650, true, 'SANA0004'),
('Sanarystraße', '6',  47.56190, 7.94720, true, 'SANA0006'),
('Sanarystraße', '8',  47.56198, 7.94790, true, 'SANA0008'),
('Sanarystraße', '10', 47.56200, 7.94860, true, 'SANA0010'),
('Sanarystraße', '12', 47.56200, 7.94930, true, 'SANA0012'),
('Sanarystraße', '14', 47.56195, 7.95000, true, 'SANA0014'),
('Sanarystraße', '16', 47.56188, 7.95070, true, 'SANA0016'),
('Sanarystraße', '18', 47.56175, 7.95140, true, 'SANA0018'),
('Sanarystraße', '20', 47.56158, 7.95200, true, 'SANA0020');

-- Haushalte: Oberer Rebberg (8 Häuser)
-- Südlichste Straße, ~120m südlich der Sanarystraße, bogenförmig W→E
INSERT INTO households (street_name, house_number, lat, lng, verified, invite_code) VALUES
('Oberer Rebberg', '1',  47.56040, 7.94680, true, 'REBB0001'),
('Oberer Rebberg', '3',  47.56030, 7.94760, true, 'REBB0003'),
('Oberer Rebberg', '5',  47.56025, 7.94840, true, 'REBB0005'),
('Oberer Rebberg', '7',  47.56022, 7.94920, true, 'REBB0007'),
('Oberer Rebberg', '9',  47.56025, 7.95000, true, 'REBB0009'),
('Oberer Rebberg', '11', 47.56032, 7.95080, true, 'REBB0011'),
('Oberer Rebberg', '13', 47.56042, 7.95160, true, 'REBB0013'),
('Oberer Rebberg', '15', 47.56058, 7.95230, true, 'REBB0015');

-- Beispiel-News
INSERT INTO news_items (source_url, original_title, ai_summary, category, relevance_score, published_at) VALUES
('https://www.bad-saeckingen.de', 'Kanalarbeiten Sanarystraße ab Montag', 'Ab Montag wird die Sanarystraße wegen Kanalarbeiten halbseitig gesperrt. Die Arbeiten dauern voraussichtlich 3 Tage.', 'infrastructure', 9, now()),
('https://www.bad-saeckingen.de', 'Gelber Sack: Nächste Abholung Donnerstag', 'Die nächste Abholung der Gelben Säcke im Quartier ist am kommenden Donnerstag.', 'waste', 7, now() - interval '1 day'),
('https://www.bad-saeckingen.de', 'Stadtfest Bad Säckingen 15.–17. Juni', 'Das jährliche Stadtfest findet vom 15. bis 17. Juni auf dem Münsterplatz statt. Samstag Abend gibt es ein Feuerwerk.', 'events', 6, now() - interval '2 days');
