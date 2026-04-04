-- Migration 130: Erweitert municipal_config um dynamische Quartier-Daten
-- Ersetzt hardcoded Apotheken, Events, OEPNV-Haltestellen in quartier-info.service.ts

-- Neue Spalten hinzufuegen
ALTER TABLE municipal_config
  ADD COLUMN IF NOT EXISTS apotheken JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS events JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS oepnv_stops JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS notdienst_url TEXT,
  ADD COLUMN IF NOT EXISTS events_calendar_url TEXT;

-- Kommentar
COMMENT ON COLUMN municipal_config.apotheken IS 'Apotheken im Quartier: [{name, address, phone, openingHours}]';
COMMENT ON COLUMN municipal_config.events IS 'Regelmaessige Veranstaltungen: [{title, description, schedule, location, icon}]';
COMMENT ON COLUMN municipal_config.oepnv_stops IS 'OEPNV-Haltestellen (EFA-BW IDs): [{id, name}]';
COMMENT ON COLUMN municipal_config.notdienst_url IS 'URL zur Apotheken-Notdienstsuche';
COMMENT ON COLUMN municipal_config.events_calendar_url IS 'URL zum staedtischen Veranstaltungskalender';

-- Bad Saeckingen Pilot: Apotheken, Events, OEPNV, Notdienst befuellen
UPDATE municipal_config SET
  apotheken = '[
    {"name": "Schwarzwald-Apotheke", "address": "Schützenstraße 16/1, 79713 Bad Säckingen", "phone": "07761 553550", "openingHours": "Mo-Fr 8:00-18:30, Sa 8:30-13:00"},
    {"name": "Bergsee-Apotheke", "address": "Bahnhofplatz 1, 79713 Bad Säckingen", "phone": "07761 7486", "openingHours": "Mo-Fr 8:00-18:30, Sa 8:00-12:30"},
    {"name": "Loewen-Apotheke", "address": "Laufenburger Straße 2, 79713 Bad Säckingen", "phone": "07761 2355", "openingHours": "Mo-Fr 8:00-18:30, Sa 8:30-12:30"}
  ]'::jsonb,
  events = '[
    {"title": "Wochenmarkt", "description": "Frische regionale Produkte auf dem Münsterplatz", "schedule": "Jeden Samstag, 08:00–12:00 Uhr", "location": "Münsterplatz", "icon": "shopping-bag"},
    {"title": "Wochenmarkt", "description": "Kleinerer Markt unter der Woche", "schedule": "Jeden Mittwoch, 08:00–12:00 Uhr", "location": "Schützenstraße", "icon": "shopping-bag"}
  ]'::jsonb,
  oepnv_stops = '[{"id": "8506566", "name": "Bad Säckingen Bahnhof"}]'::jsonb,
  notdienst_url = 'https://www.aponet.de/apotheke/notdienstsuche/79713+Bad+S%C3%A4ckingen',
  events_calendar_url = 'https://www.badsaeckingen.de/kultur-events/veranstaltungskalender'
WHERE city_name = 'Bad Säckingen';

-- Laufenburg: Grunddaten
UPDATE municipal_config SET
  apotheken = '[
    {"name": "Rhein-Apotheke", "address": "Hauptstraße 58, 79725 Laufenburg", "phone": "07763 7200", "openingHours": "Mo-Fr 8:00-18:30, Sa 8:30-12:30"}
  ]'::jsonb,
  oepnv_stops = '[{"id": "8506571", "name": "Laufenburg (Baden) Bahnhof"}]'::jsonb,
  notdienst_url = 'https://www.aponet.de/apotheke/notdienstsuche/79725+Laufenburg',
  events_calendar_url = 'https://www.laufenburg.de/veranstaltungen'
WHERE city_name = 'Laufenburg (Baden)';

-- Rheinfelden: Grunddaten
UPDATE municipal_config SET
  apotheken = '[
    {"name": "Adler-Apotheke", "address": "Friedrichstraße 2, 79618 Rheinfelden", "phone": "07623 2345", "openingHours": "Mo-Fr 8:00-18:30, Sa 8:30-12:30"},
    {"name": "Stadt-Apotheke", "address": "Karl-Fürstenberg-Straße 17, 79618 Rheinfelden", "phone": "07623 3456", "openingHours": "Mo-Fr 8:00-18:30, Sa 8:00-13:00"}
  ]'::jsonb,
  oepnv_stops = '[{"id": "8506582", "name": "Rheinfelden (Baden) Bahnhof"}]'::jsonb,
  notdienst_url = 'https://www.aponet.de/apotheke/notdienstsuche/79618+Rheinfelden',
  events_calendar_url = 'https://www.rheinfelden.de/veranstaltungen'
WHERE city_name = 'Rheinfelden (Baden)';

-- Koeln: Grunddaten
UPDATE municipal_config SET
  apotheken = '[
    {"name": "Dom-Apotheke", "address": "Komödienstraße 23, 50667 Köln", "phone": "0221 2577830", "openingHours": "Mo-Fr 8:00-19:00, Sa 9:00-14:00"}
  ]'::jsonb,
  oepnv_stops = '[{"id": "22000006", "name": "Köln Heumarkt"}]'::jsonb,
  notdienst_url = 'https://www.aponet.de/apotheke/notdienstsuche/50667+K%C3%B6ln',
  events_calendar_url = 'https://www.stadt-koeln.de/leben-in-koeln/veranstaltungskalender'
WHERE city_name = 'Köln';
