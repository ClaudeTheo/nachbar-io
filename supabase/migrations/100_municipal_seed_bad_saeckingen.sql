-- Migration 100: Seed-Daten fuer Pilotkommune Bad Saeckingen
-- Zweck: Initiale Konfiguration + Muelltermine fuer Pilot-Quartier
-- HINWEIS: quarter_id wird dynamisch per Subquery ermittelt

-- Kommunale Konfiguration
INSERT INTO municipal_config (quarter_id, city_name, state, rathaus_url, rathaus_phone, rathaus_email, opening_hours, features, service_links, wiki_entries)
SELECT
  q.id,
  'Bad Säckingen',
  'Baden-Württemberg',
  'https://www.bad-saeckingen.de',
  '07761 51-0',
  'info@bad-saeckingen.de',
  '{"mo": "8:00–12:00, 14:00–16:00", "di": "8:00–12:00", "mi": "8:00–12:00", "do": "8:00–12:00, 14:00–18:00", "fr": "8:00–12:00"}'::jsonb,
  '{"reports": true, "waste_calendar": true, "announcements": true, "wiki": true, "service_links": true}'::jsonb,
  '[
    {"label": "Rathaus Bad Säckingen", "url": "https://www.bad-saeckingen.de", "icon": "building", "category": "kontakt"},
    {"label": "Bürgerbüro", "url": "https://www.bad-saeckingen.de/rathaus-service/buergerservice/was-erledige-ich-wo", "icon": "users", "category": "kontakt"},
    {"label": "Standesamt", "url": "https://www.bad-saeckingen.de/rathaus-service/verwaltungsaufbau/alle-fachbereiche/personenstandswesen", "icon": "file-text", "category": "kontakt"},
    {"label": "Fundbüro", "url": "https://www.bad-saeckingen.de/rathaus-service/buergerservice/behoerden-dienstleistungen/6000959/fundsache-abgeben-oder-nachfragen", "icon": "search", "category": "service"},
    {"label": "Abfallwirtschaft Waldshut", "url": "https://www.awb-landkreis-waldshut.de", "icon": "trash", "category": "service"},
    {"label": "Formulare & Anträge", "url": "https://www.bad-saeckingen.de/rathaus-service/buergerservice/formulare-onlinedienste", "icon": "clipboard", "category": "formulare"},
    {"label": "KFZ-Zulassung (Landratsamt)", "url": "https://www.landkreis-waldshut.de/kfz", "icon": "car", "category": "formulare"},
    {"label": "Polizei Bad Säckingen", "url": "https://www.polizei-bw.de", "icon": "shield", "category": "notfall"},
    {"label": "Stadtwerke Bad Säckingen", "url": "https://www.stadtwerke-bad-saeckingen.de", "icon": "zap", "category": "versorgung"}
  ]'::jsonb,
  '[
    {"question": "Wo melde ich ein Schlagloch?", "answer": "Beim Bauhof der Stadt Bad Säckingen (Tel. 07761 51-0). In der QuartierApp können Sie es zusätzlich als Community-Meldung erfassen.", "category": "infrastruktur", "links": [{"label": "Rathaus kontaktieren", "url": "https://www.bad-saeckingen.de/rathaus-service/buergerservice/kontakt-oeffnungszeiten"}]},
    {"question": "Wo melde ich eine defekte Straßenlaterne?", "answer": "Bei den Stadtwerken Bad Säckingen.", "category": "infrastruktur", "links": [{"label": "Stadtwerke", "url": "https://www.stadtwerke-bad-saeckingen.de"}]},
    {"question": "Wo melde ich illegale Müllablagerung?", "answer": "Beim Ordnungsamt der Stadt oder bei der Abfallwirtschaft Waldshut.", "category": "entsorgung", "links": [{"label": "AWB Waldshut", "url": "https://www.awb-landkreis-waldshut.de"}]},
    {"question": "Wann wird mein Müll abgeholt?", "answer": "Siehe unseren Müllkalender in der App. Verbindliche Termine finden Sie beim AWB Waldshut.", "category": "entsorgung", "links": [{"label": "AWB Abfuhrkalender", "url": "https://www.awb-landkreis-waldshut.de/abfuhrkalender"}]},
    {"question": "Wie melde ich meinen Wohnsitz an?", "answer": "Im Bürgerbüro der Stadt mit Personalausweis und Wohnungsgeberbestätigung.", "category": "verwaltung", "links": [{"label": "Bürgerbüro", "url": "https://www.bad-saeckingen.de/rathaus-service/buergerservice/was-erledige-ich-wo"}]},
    {"question": "Wo bekomme ich einen Bewohnerparkausweis?", "answer": "Im Bürgerbüro. Personalausweis und Fahrzeugschein mitbringen.", "category": "verwaltung", "links": [{"label": "Bürgerbüro", "url": "https://www.bad-saeckingen.de/rathaus-service/buergerservice/was-erledige-ich-wo"}]},
    {"question": "Wo melde ich Ruhestörung?", "answer": "Bei der Polizei (07761 934-0) oder dem Ordnungsamt.", "category": "ordnung", "links": [{"label": "Polizei", "url": "https://www.polizei-bw.de"}]},
    {"question": "Wo finde ich das Amtsblatt?", "answer": "Auf der Website der Stadt unter Bekanntmachungen.", "category": "verwaltung", "links": [{"label": "Stadt Bad Säckingen", "url": "https://www.bad-saeckingen.de"}]}
  ]'::jsonb
FROM quarters q
WHERE q.name ILIKE '%Bad Säckingen%' OR q.name ILIKE '%bad saeckingen%' OR q.name ILIKE '%Purkersdorfer%'
LIMIT 1
ON CONFLICT (quarter_id) DO NOTHING;

-- Muellkalender: Beispieltermine fuer April-Juni 2026
-- (werden spaeter durch echte Daten ersetzt)
INSERT INTO waste_schedules (quarter_id, waste_type, collection_date, notes, source)
SELECT q.id, t.waste_type::waste_type, t.collection_date::date, t.notes, 'manual'::waste_source
FROM quarters q,
(VALUES
  -- April 2026
  ('restmuell', '2026-04-02', NULL),
  ('biomuell',  '2026-04-02', NULL),
  ('restmuell', '2026-04-16', NULL),
  ('biomuell',  '2026-04-16', NULL),
  ('papier',    '2026-04-09', NULL),
  ('gelber_sack','2026-04-09', NULL),
  ('gruenschnitt','2026-04-18', 'Saisonstart Grünschnitt'),
  -- Mai 2026
  ('restmuell', '2026-05-07', NULL),
  ('biomuell',  '2026-05-07', NULL),
  ('restmuell', '2026-05-21', NULL),
  ('biomuell',  '2026-05-21', NULL),
  ('papier',    '2026-05-14', NULL),
  ('gelber_sack','2026-05-14', NULL),
  ('gruenschnitt','2026-05-16', NULL),
  -- Juni 2026
  ('restmuell', '2026-06-04', NULL),
  ('biomuell',  '2026-06-04', NULL),
  ('restmuell', '2026-06-18', NULL),
  ('biomuell',  '2026-06-18', NULL),
  ('papier',    '2026-06-11', NULL),
  ('gelber_sack','2026-06-11', NULL),
  ('gruenschnitt','2026-06-13', NULL)
) AS t(waste_type, collection_date, notes)
WHERE q.name ILIKE '%Bad Säckingen%' OR q.name ILIKE '%bad saeckingen%' OR q.name ILIKE '%Purkersdorfer%'
ON CONFLICT (quarter_id, waste_type, collection_date) DO NOTHING;
