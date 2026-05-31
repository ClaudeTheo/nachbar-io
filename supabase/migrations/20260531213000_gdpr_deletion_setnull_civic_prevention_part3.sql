-- Migration: GDPR-Löschung Teil 3a — Civic/OZG/Prevention/Pflege-Profi Aktor-/Beleg-FKs (Art. 17)
-- Datum: 2026-05-31 — Folge zu 20260530120000 (Teil 2). Pre-Pilot-Audit Cluster B / Block A.
--
-- PROBLEM: Nach Teil 1+2 blockierten noch 51 NO-ACTION-FKs (Profi-Vertical) jedes
-- DELETE public.users für Profi-/Civic-/Prevention-Nutzer. Diese Migration stellt die
-- REINEN AKTOR-/ERSTELLER-/BELEG-FKs der Civic/OZG/Prevention/Pflege-Profi-Tabellen auf
-- SET NULL um: die Zeile gehört der Verwaltung/dem Quartier/einem anderen Nutzer ODER ist
-- ein Zahlungsbeleg (§147 AO) → der Aktor-Bezug wird anonymisiert, der amtliche/Quartiers-
-- Eintrag bleibt erhalten. Gleiche Philosophie wie Teil 2 (created_by/*_by/payer).
--
-- BEWUSST NICHT in dieser Migration (= Teil 3b, Founder-/Albiez-Entscheidung CASCADE vs
-- SET NULL, da echte Subjekt-Daten/Korrespondenz mit Freitext bzw. Einwilligung):
--   civic_messages.citizen_user_id / sender_user_id (OZG-Korrespondenz, mögl.
--     Verwaltungsaufbewahrung), civic_survey_votes.user_id, prevention_enrollments.user_id,
--     prevention_messages.sender_id / recipient_id, prevention_reviews.user_id,
--     prevention_visibility_consent.user_id (Einwilligung).
-- BEWUSST NICHT (= Teil 4, §630f BGB / MBO-Ä ~10 J, rechtlich geprüfte fristen-gesteuerte
--   Löschlogik, vor Profi-Pilot): doctor_*/medical_*/anamnesis_/prescription_*/prescriptions/
--   recall_reminders/waiting_room/practices/practice_members/team_*.
--
-- Spiegel der TS-Registry lib/services/gdpr/user-data-registry.ts (GDPR_DELETION_FKS, Teil 3a).
-- Pattern wie 20260530120000: drift-tolerant (to_regclass/information_schema) +
-- FK-Namen-erhaltend (DROP + ADD mit gleichem conname). Idempotent. File-first.
-- Prod-Apply + Merge = Founder-Go.

-- ============================================================
-- Schritt 1 — NOT-NULL-Aktor-Spalten nullable machen (für ON DELETE SET NULL)
-- ============================================================
DO $do$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('civic_message_attachments','uploaded_by'),
      ('pflege_resident_assignments','assigned_by'),
      ('prevention_courses','instructor_id'),
      ('prevention_group_calls','instructor_id')
    ) AS t(tbl, col)
  LOOP
    IF to_regclass('public.' || r.tbl) IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = r.tbl AND column_name = r.col
       ) THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP NOT NULL', r.tbl, r.col);
    END IF;
  END LOOP;
END
$do$;

-- ============================================================
-- Schritt 2 — FK-delete_rule auf SET NULL umstellen (idempotent, namens- & drift-tolerant)
-- ============================================================
DO $do$
DECLARE
  r RECORD;
  v_conname text;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      -- (child_table, child_column, parent_schema, rule) — alle SET NULL
      -- Civic / OZG (Verwaltungs-/Quartiers-Einträge, parent auth.users)
      ('citizen_reports','reported_by','auth','SET NULL'),
      ('civic_announcements','created_by','auth','SET NULL'),
      ('civic_appointments','created_by','auth','SET NULL'),
      ('civic_document_requests','requested_by','auth','SET NULL'),
      ('civic_events','created_by','auth','SET NULL'),
      ('civic_message_attachments','uploaded_by','auth','SET NULL'),
      ('civic_messages','read_by','auth','SET NULL'),
      ('civic_surveys','created_by','auth','SET NULL'),
      ('construction_sites','created_by','auth','SET NULL'),
      ('crisis_alerts','created_by','auth','SET NULL'),
      ('municipal_announcements','author_id','auth','SET NULL'),
      -- Pflege-Profi (Zuweisungs-Aktoren, parent auth.users)
      ('pflege_resident_assignments','assigned_by','auth','SET NULL'),
      ('pflege_resident_assignments','revoked_by','auth','SET NULL'),
      -- Prevention (Kurs-Aktoren + Zahlungs-Belege, parent public.users)
      ('prevention_course_content','updated_by','public','SET NULL'),
      ('prevention_courses','instructor_id','public','SET NULL'),
      ('prevention_enrollments','certificate_issued_by','public','SET NULL'),
      ('prevention_enrollments','payer_user_id','public','SET NULL'),
      ('prevention_group_calls','instructor_id','public','SET NULL'),
      ('prevention_payments','payer_user_id','public','SET NULL')
    ) AS t(tbl, col, parent_schema, rule)
  LOOP
    -- Drift-Toleranz: Tabelle/Spalte muss im aktuellen Stack existieren
    IF to_regclass('public.' || r.tbl) IS NULL
       OR NOT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = r.tbl AND column_name = r.col
       ) THEN
      CONTINUE;
    END IF;

    -- Bestehenden FK auf public.<tbl>.<col> → <parent_schema>.users(id) finden (Name erhalten)
    SELECT c.conname INTO v_conname
    FROM pg_constraint c
    JOIN pg_class child       ON child.oid  = c.conrelid
    JOIN pg_namespace cn      ON cn.oid     = child.relnamespace
    JOIN pg_class parent      ON parent.oid = c.confrelid
    JOIN pg_namespace pn      ON pn.oid     = parent.relnamespace
    WHERE c.contype = 'f'
      AND cn.nspname = 'public'
      AND child.relname = r.tbl
      AND pn.nspname = r.parent_schema
      AND parent.relname = 'users'
      AND array_length(c.conkey, 1) = 1
      AND (SELECT attname FROM pg_attribute
           WHERE attrelid = child.oid AND attnum = c.conkey[1]) = r.col;

    -- Nur bestehende FKs umstellen (gleicher Name). Existiert keiner (Drift), überspringen.
    IF v_conname IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.tbl, v_conname);
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I.users(id) ON DELETE %s',
      r.tbl, v_conname, r.col, r.parent_schema, r.rule
    );
  END LOOP;
END
$do$;
