-- Migration 140: Praevention Testdaten fuer Bad Saeckingen
-- Kurs "Aktiv im Quartier — Stressbewaeltigung" mit Kursleiter Lisa

-- IDs
-- Lisa (Kursleiter): 6a8dbebe-c7c5-487b-8e2d-fdb578441929
-- Helga: c1a87c11-184e-449d-a3f4-a5913829f8e4
-- Felix: 29c87a1c-bc1a-4cb4-bc76-06ed7d649774
-- Max: 99e6daf5-1e41-4366-af17-2b0fc5da4a01
-- Quarter BS: ee6cfcab-f615-47cd-afe7-808a27cb584b

DO $$
DECLARE
  v_course_id UUID;
  v_lisa_id UUID := '6a8dbebe-c7c5-487b-8e2d-fdb578441929';
  v_helga_id UUID := 'c1a87c11-184e-449d-a3f4-a5913829f8e4';
  v_felix_id UUID := '29c87a1c-bc1a-4cb4-bc76-06ed7d649774';
  v_max_id UUID := '99e6daf5-1e41-4366-af17-2b0fc5da4a01';
  v_quarter_id UUID := 'ee6cfcab-f615-47cd-afe7-808a27cb584b';
  v_start_date TIMESTAMPTZ := now() + INTERVAL '14 days';
  v_end_date TIMESTAMPTZ := now() + INTERVAL '70 days'; -- 8 Wochen nach Start
BEGIN
  IF (
    SELECT COUNT(*) FROM users
    WHERE id IN (v_lisa_id, v_helga_id, v_felix_id, v_max_id)
  ) < 4
    OR NOT EXISTS (SELECT 1 FROM quarters WHERE id = v_quarter_id) THEN
    RAISE NOTICE 'Praevention-Testdaten uebersprungen: feste Seed-User oder Quartier fehlen';
    RETURN;
  END IF;

  -- 1. Kurs erstellen
  INSERT INTO prevention_courses (id, title, description, instructor_id, quarter_id, starts_at, ends_at, max_participants, status)
  VALUES (
    gen_random_uuid(),
    'Aktiv im Quartier — Stressbewältigung',
    'ZPP-zertifizierter 8-Wochen-Kurs zur Stressbewältigung nach § 20 SGB V. Tägliche KI-geführte Übungen (10-15 Min) und wöchentliche 60-Min-Gruppeneinheiten mit qualifizierter Kursleitung. Methoden: Progressive Muskelrelaxation, Atemtechniken, Achtsamkeit, soziale Aktivierung.',
    v_lisa_id,
    v_quarter_id,
    v_start_date,
    v_end_date,
    15,
    'planned'
  ) RETURNING id INTO v_course_id;

  -- 2. Wochen-Inhalte mit KI-System-Prompts
  INSERT INTO prevention_course_content (course_id, week_number, title, description, methods, ki_system_prompt) VALUES
    (v_course_id, 1, 'Ankommen & Grundlagen', 'Einführung: Was ist Stress? Körperliche Stressreaktionen erkennen. Erste PMR-Übung.',
     ARRAY['Psychoedukation', 'PMR Einführung', 'Körperwahrnehmung'],
     'Du bist ein einfühlsamer Kursbegleiter für Woche 1. Thema: Ankommen. Begrüße den Teilnehmer warmherzig. Leite eine kurze PMR-Übung an (Hände, Arme). Erkläre verständlich, was Stress im Körper auslöst. Sprich ruhig und langsam.'),
    (v_course_id, 2, 'Atemtechniken', 'Atemübungen als schnelle Stressregulation. 4-7-8 Technik. Bauchatmung.',
     ARRAY['4-7-8 Atemtechnik', 'Bauchatmung', 'Atembeobachtung'],
     'Du bist ein einfühlsamer Kursbegleiter für Woche 2. Thema: Atemtechniken. Leite die 4-7-8 Atemübung an: 4 Sekunden einatmen, 7 Sekunden halten, 8 Sekunden ausatmen. Erkläre die beruhigende Wirkung auf das Nervensystem.'),
    (v_course_id, 3, 'Achtsamkeit', 'Body Scan und achtsame Wahrnehmung im Alltag.',
     ARRAY['Body Scan', 'Achtsames Essen', 'Gedanken beobachten'],
     'Du bist ein einfühlsamer Kursbegleiter für Woche 3. Thema: Achtsamkeit. Leite einen Body Scan an: Aufmerksamkeit wandert langsam von den Füßen bis zum Kopf. Keine Bewertung, nur wahrnehmen.'),
    (v_course_id, 4, 'Wohlwollen & Mitgefühl', 'Metta-Meditation und Selbstmitgefühl. Dankbarkeitsübung.',
     ARRAY['Metta-Meditation', 'Selbstmitgefühl', 'Dankbarkeit'],
     'Du bist ein einfühlsamer Kursbegleiter für Woche 4. Thema: Wohlwollen. Leite eine Metta-Meditation an: Beginne mit dir selbst, dann erweitere auf nahestehende Menschen und die Nachbarschaft. Schließe mit einer Dankbarkeitsübung ab.'),
    (v_course_id, 5, 'Soziale Aktivierung', 'Gemeinsam aktiv im Quartier. Soziale Ressourcen erkennen.',
     ARRAY['Soziale Ressourcen', 'Gemeinsame Spaziergänge', 'Nachbarschaftshilfe'],
     'Du bist ein einfühlsamer Kursbegleiter für Woche 5. Thema: Soziale Aktivierung. Frage nach sozialen Kontakten im Quartier. Ermutige zu einem gemeinsamen Spaziergang oder einem kurzen Besuch. Leite eine kurze Entspannung an.'),
    (v_course_id, 6, 'Bewegung & Natur', 'Sanfte Bewegung als Stresspuffer. Naturerleben im Quartier.',
     ARRAY['Sanfte Bewegung', 'Naturerleben', 'Quartiers-Spaziergang'],
     'Du bist ein einfühlsamer Kursbegleiter für Woche 6. Thema: Bewegung. Leite sanfte Dehnübungen an (im Sitzen möglich). Ermutige zu einem Spaziergang im Quartier. Kombiniere mit einer kurzen Atemübung.'),
    (v_course_id, 7, 'Genuss & Freude', 'Positive Erlebnisse bewusst gestalten. Genusstraining.',
     ARRAY['Genusstraining', 'Kreative Aktivitäten', 'Kulturelle Teilhabe'],
     'Du bist ein einfühlsamer Kursbegleiter für Woche 7. Thema: Genuss. Leite ein Genusstraining an: Bewusstes Schmecken, Riechen, Fühlen. Ermutige zu einer Aktivität, die Freude macht. Schließe mit einer PMR-Kurzform ab.'),
    (v_course_id, 8, 'Transfer & Abschluss', 'Gelerntes verankern. Persönlicher Stressplan. Rückblick.',
     ARRAY['Persönlicher Stressplan', 'Rückblick', 'Weiterführende Angebote'],
     'Du bist ein einfühlsamer Kursbegleiter für Woche 8. Thema: Abschluss. Fasse die gelernten Techniken zusammen. Hilf beim Erstellen eines persönlichen Stressplans. Verabschiede dich warmherzig und ermutige zur Weiterführung.');

  -- 3. Video-Gruppen-Calls (jeden Mittwoch 14:00, 8 Wochen)
  INSERT INTO prevention_group_calls (course_id, week_number, scheduled_at, instructor_id, duration_minutes) VALUES
    (v_course_id, 1, v_start_date + INTERVAL '2 days' + TIME '14:00', v_lisa_id, 60),
    (v_course_id, 2, v_start_date + INTERVAL '9 days' + TIME '14:00', v_lisa_id, 60),
    (v_course_id, 3, v_start_date + INTERVAL '16 days' + TIME '14:00', v_lisa_id, 60),
    (v_course_id, 4, v_start_date + INTERVAL '23 days' + TIME '14:00', v_lisa_id, 60),
    (v_course_id, 5, v_start_date + INTERVAL '30 days' + TIME '14:00', v_lisa_id, 60),
    (v_course_id, 6, v_start_date + INTERVAL '37 days' + TIME '14:00', v_lisa_id, 60),
    (v_course_id, 7, v_start_date + INTERVAL '44 days' + TIME '14:00', v_lisa_id, 60),
    (v_course_id, 8, v_start_date + INTERVAL '51 days' + TIME '14:00', v_lisa_id, 60);

  -- 4. Einschreibungen: Helga, Felix, Max (Pilot = kostenlos)
  INSERT INTO prevention_enrollments (course_id, user_id, payer_type) VALUES
    (v_course_id, v_helga_id, 'pilot_free'),
    (v_course_id, v_felix_id, 'pilot_free'),
    (v_course_id, v_max_id, 'pilot_free');

  -- 5. Willkommensnachricht
  INSERT INTO prevention_messages (course_id, sender_id, message_type, subject, body) VALUES
    (v_course_id, v_lisa_id, 'broadcast', 'Willkommen bei "Aktiv im Quartier"!',
     'Liebe Teilnehmerinnen und Teilnehmer, herzlich willkommen zu unserem 8-wöchigen Präventionskurs! In den nächsten Wochen lernen Sie verschiedene Techniken zur Stressbewältigung kennen. Ihre täglichen Übungen (10-15 Minuten) können Sie jederzeit über die App durchführen. Jeden Mittwoch um 14:00 Uhr treffen wir uns zur gemeinsamen Video-Einheit. Ich freue mich auf die gemeinsame Zeit! Ihre Dr. Lisa Hoffmann');

END $$;
