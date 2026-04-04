-- Migration 127: Laufenburg municipal_config + Beispiel-Events fuer alle Quartiere
-- Behebt Bug: Sandra (Laufenburg) sieht "Rathaus Bad Saeckingen" statt Laufenburg
-- Behebt: Quartierkalender leer (keine Testdaten)

-- 1. Municipal Config fuer Laufenburg
INSERT INTO municipal_config (quarter_id, city_name, state, rathaus_url, rathaus_phone, rathaus_email, opening_hours, features, service_links, wiki_entries)
SELECT
  q.id,
  'Laufenburg (Baden)',
  'Baden-Württemberg',
  'https://www.laufenburg.de',
  '07763 806-0',
  'info@laufenburg.de',
  '{"mo": "8:00-12:00", "di": "8:00-12:00, 14:00-16:00", "mi": "8:00-12:00", "do": "8:00-12:00, 14:00-18:00", "fr": "8:00-12:00"}'::jsonb,
  '{"reports": true, "waste_calendar": true, "announcements": true, "wiki": true, "service_links": true}'::jsonb,
  '[
    {"label": "Rathaus Laufenburg", "url": "https://www.laufenburg.de", "icon": "building", "category": "kontakt"},
    {"label": "Bürgerbüro", "url": "https://www.laufenburg.de/buergerbuero", "icon": "users", "category": "kontakt"},
    {"label": "Abfallwirtschaft Waldshut", "url": "https://www.awb-landkreis-waldshut.de", "icon": "trash", "category": "service"},
    {"label": "Formulare & Anträge", "url": "https://www.laufenburg.de/formulare", "icon": "clipboard", "category": "formulare"},
    {"label": "Veranstaltungskalender", "url": "https://www.laufenburg.de/veranstaltungen", "icon": "calendar", "category": "service"},
    {"label": "Polizei Laufenburg", "url": "https://www.polizei-bw.de", "icon": "shield", "category": "notfall"}
  ]'::jsonb,
  '[
    {"question": "Wo melde ich ein Schlagloch?", "answer": "Beim Bauhof der Stadt Laufenburg (Tel. 07763 806-0).", "category": "infrastruktur", "links": [{"label": "Rathaus kontaktieren", "url": "https://www.laufenburg.de/kontakt"}]},
    {"question": "Wann wird mein Müll abgeholt?", "answer": "Siehe Müllkalender in der App. Verbindliche Termine beim AWB Waldshut.", "category": "entsorgung", "links": [{"label": "AWB Abfuhrkalender", "url": "https://www.awb-landkreis-waldshut.de/abfuhrkalender"}]},
    {"question": "Wie melde ich meinen Wohnsitz an?", "answer": "Im Bürgerbüro mit Personalausweis und Wohnungsgeberbestätigung.", "category": "verwaltung", "links": [{"label": "Bürgerbüro", "url": "https://www.laufenburg.de/buergerbuero"}]}
  ]'::jsonb
FROM quarters q
WHERE q.slug = 'laufenburg-altstadt'
ON CONFLICT (quarter_id) DO NOTHING;

-- 2. Beispiel-Events fuer alle 4 Quartiere (Quartierkalender nicht leer)
DO $$
DECLARE
  q RECORD;
  admin_id UUID;
BEGIN
  -- Einen beliebigen Nutzer als Ersteller nehmen (erster Nutzer im Quartier)
  FOR q IN SELECT id, slug, name FROM quarters WHERE status = 'active'
  LOOP
    -- Ersteller: erster Nutzer im Quartier
    SELECT hm.user_id INTO admin_id
    FROM household_members hm
    JOIN households h ON h.id = hm.household_id
    WHERE h.quarter_id = q.id
    LIMIT 1;

    -- Falls kein Nutzer im Quartier: ueberspringen
    IF admin_id IS NULL THEN CONTINUE; END IF;

    -- Fruehlingsmarkt (kommende Woche)
    INSERT INTO events (user_id, title, description, location, event_date, event_time, end_time, category, quarter_id)
    VALUES (
      admin_id,
      CASE q.slug
        WHEN 'bad-saeckingen-pilot' THEN 'Frühlingsmarkt am Münsterplatz'
        WHEN 'laufenburg-altstadt' THEN 'Altstadtfest Laufenburg'
        WHEN 'rheinfelden-zentrum' THEN 'Rheinfelder Frühlingsmarkt'
        WHEN 'koeln-altstadt' THEN 'Kölner Streetfood-Festival'
        ELSE 'Quartiersfest'
      END,
      'Gemeinsames Feiern im Quartier mit Musik, Essen und guter Laune.',
      CASE q.slug
        WHEN 'bad-saeckingen-pilot' THEN 'Münsterplatz, Bad Säckingen'
        WHEN 'laufenburg-altstadt' THEN 'Hauptstraße, Laufenburg'
        WHEN 'rheinfelden-zentrum' THEN 'Friedrichplatz, Rheinfelden'
        WHEN 'koeln-altstadt' THEN 'Alter Markt, Köln'
        ELSE 'Quartierszentrum'
      END,
      CURRENT_DATE + INTERVAL '7 days',
      '14:00', '20:00', 'community', q.id
    )
    ON CONFLICT DO NOTHING;

    -- Senioren-Spaziergang (naechste Woche)
    INSERT INTO events (user_id, title, description, location, event_date, event_time, end_time, category, max_participants, quarter_id)
    VALUES (
      admin_id,
      'Senioren-Spaziergang',
      'Gemeinsamer Spaziergang durch das Quartier. Treffpunkt am Eingang. Alle sind willkommen!',
      CASE q.slug
        WHEN 'bad-saeckingen-pilot' THEN 'Trompeterbrücke'
        WHEN 'laufenburg-altstadt' THEN 'Laufenbrücke'
        WHEN 'rheinfelden-zentrum' THEN 'Rheinufer'
        WHEN 'koeln-altstadt' THEN 'Rheinpromenade'
        ELSE 'Quartierszentrum'
      END,
      CURRENT_DATE + INTERVAL '5 days',
      '10:00', '11:30', 'seniors', 15, q.id
    )
    ON CONFLICT DO NOTHING;

    -- Nachbarschafts-Café (uebermorgen)
    INSERT INTO events (user_id, title, description, location, event_date, event_time, end_time, category, quarter_id)
    VALUES (
      admin_id,
      'Nachbarschafts-Café',
      'Kaffee und Kuchen — lernen Sie Ihre Nachbarn kennen! Jeder bringt etwas Selbstgebackenes mit.',
      'Gemeindehaus',
      CURRENT_DATE + INTERVAL '2 days',
      '15:00', '17:00', 'community', q.id
    )
    ON CONFLICT DO NOTHING;

    -- Flohmarkt (in 2 Wochen)
    INSERT INTO events (user_id, title, description, location, event_date, event_time, end_time, category, quarter_id)
    VALUES (
      admin_id,
      'Quartiers-Flohmarkt',
      'Trödeln, stöbern, feilschen! Standgebühr: kostenlos für Quartiersbewohner.',
      CASE q.slug
        WHEN 'bad-saeckingen-pilot' THEN 'Schloßplatz'
        WHEN 'laufenburg-altstadt' THEN 'Marktgasse'
        WHEN 'rheinfelden-zentrum' THEN 'Karl-Fürstenberg-Straße'
        WHEN 'koeln-altstadt' THEN 'Heumarkt'
        ELSE 'Hauptplatz'
      END,
      CURRENT_DATE + INTERVAL '14 days',
      '09:00', '15:00', 'market', q.id
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
