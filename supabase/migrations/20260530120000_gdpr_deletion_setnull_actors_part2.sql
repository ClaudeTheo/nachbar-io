-- Migration: GDPR-Löschung Teil 2 — Aktor-/Bezugs-FKs außerhalb Profi-Vertical (Art. 17)
-- Datum: 2026-05-30 — Folge zu 20260529140000 (Pre-Pilot-Audit Cluster B)
--
-- PROBLEM: Nach Teil 1 (20260529140000) blockierten noch ~76 NO-ACTION-FKs auf users
-- eine vollständige Löschung. Diese Migration stellt die NICHT-Profi-Aktor-/Bezugs-FKs
-- auf SET NULL um, sodass die Löschung eines Resident-/Familie-/Youth-/Admin-/Org-Nutzers
-- nicht mehr fail-loud abbricht. Alle betroffenen Spalten sind reine Aktor-/Bezugs-Spalten
-- (created_by, *_by, registered_by, accepted_by, …) → SET NULL anonymisiert den Bezug,
-- die Zeile (Einladung, Log, Buchung, Org-/Moderations-Eintrag) bleibt erhalten.
--
-- VERTAGT (NICHT in dieser Migration): Profi-Medizin/Civic/Pflege-FKs (doctor_/medical_/
-- anamnesis_/prescription_/practice_/civic_/prevention_/team_/pflege_resident_assignments).
-- Grund: ärztliche/amtliche Dokumentation unterliegt gesetzlichen Aufbewahrungsfristen
-- (§ 630f BGB / MBO-Ä ~10 Jahre). Diese brauchen eine eigene, rechtlich geprüfte
-- Löschlogik (fristen-gesteuert) und werden vor dem Profi-Pilot separat behandelt.
--
-- Spiegel der TS-Registry lib/services/gdpr/user-data-registry.ts (GDPR_DELETION_FKS).
-- Pattern wie 20260529140000: drift-tolerant (to_regclass/information_schema) +
-- FK-Namen-erhaltend (DROP + ADD mit gleichem conname, nur bestehende FKs umstellen).
-- Idempotent (mehrfach ausführbar). File-first. Prod-Apply + Merge = Founder-Go.

-- ============================================================
-- Schritt 1 — NOT-NULL-Aktor-Spalten nullable machen (für ON DELETE SET NULL)
-- ============================================================
DO $do$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('access_codes','created_by'),
      ('admin_access_logs','admin_id'),
      ('content_reports','reporter_id'),
      ('cross_org_requests','created_by'),
      ('youth_moderation_log','moderator_id'),
      ('youth_tasks','created_by')
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
      -- (child_table, child_column, parent_schema, rule) — alle SET NULL, parent auth.users
      -- Resident / Familie / Youth
      ('neighbor_invitations','accepted_by','auth','SET NULL'),
      ('neighbor_invitations','converted_user_id','auth','SET NULL'),
      ('users','registered_by','auth','SET NULL'),
      ('content_reports','reporter_id','auth','SET NULL'),
      ('content_reports','reviewed_by','auth','SET NULL'),
      ('youth_tasks','accepted_by','auth','SET NULL'),
      ('youth_tasks','created_by','auth','SET NULL'),
      ('youth_moderation_log','moderator_id','auth','SET NULL'),
      -- Admin / Org / Business (Aktor-/Log-Bezüge → Buchhaltung/Logs bleiben erhalten)
      ('access_codes','created_by','auth','SET NULL'),
      ('admin_access_logs','admin_id','auth','SET NULL'),
      ('admin_expenses','admin_id','auth','SET NULL'),
      ('business_settings','updated_by','auth','SET NULL'),
      ('business_transactions','created_by','auth','SET NULL'),
      ('data_breach_incidents','admin_id','auth','SET NULL'),
      ('feature_flags_audit_log','changed_by','auth','SET NULL'),
      ('moderation_actions','created_by','auth','SET NULL'),
      ('moderation_queue','reviewed_by','auth','SET NULL'),
      ('monthly_summaries','closed_by','auth','SET NULL'),
      ('tech_incidents','admin_id','auth','SET NULL'),
      ('verification_requests','reviewed_by','auth','SET NULL'),
      ('org_neighbors','confirmed_by','auth','SET NULL'),
      ('org_neighbors','requested_by','auth','SET NULL'),
      ('organizations','verified_by','auth','SET NULL'),
      ('cross_org_requests','created_by','auth','SET NULL'),
      ('cross_org_requests','modified_by','auth','SET NULL')
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

    -- Bestehenden FK auf public.<tbl>.<col> → auth.users(id) finden (Name erhalten)
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
