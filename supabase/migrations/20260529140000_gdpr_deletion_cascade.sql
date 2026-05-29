-- Migration: GDPR-Löschkaskade (Art. 17) — Pre-Pilot-Audit Cluster B (B3/B4)
-- Datum: 2026-05-29
--
-- PROBLEM: care_*/memory_*/group_*-Tabellen hängen mit NO ACTION an users(id).
-- Dadurch scheitert DELETE FROM users für jeden Nutzer mit Pflege-Daten an der
-- Fremdschlüssel-Sperre → Senioren waren faktisch unlöschbar (Art.-17-Verstoß).
--
-- LÖSUNG:
--   1. Aktor-Spalten nullable machen (Voraussetzung für ON DELETE SET NULL).
--   2. care_audit_log-Trigger GDPR-fähig (per Session-GUC app.gdpr_delete).
--   3. FK-delete_rule umstellen: Subjekt-Daten → CASCADE, Aktor/Log → SET NULL.
--   4. SECURITY-DEFINER-RPC gdpr_delete_user(uuid) als einziger Lösch-Einstieg.
--
-- Spiegel der TS-Registry lib/services/gdpr/user-data-registry.ts (GDPR_DELETION_FKS).
-- Der Static-Test __tests__/gdpr/gdpr-migration.test.ts prüft TS↔SQL-Konsistenz.
--
-- SCOPE: Resident/Caregiver/Senior/Memory/Group/Consent-Datenraum (Pilot).
-- Profi-Verticals (doctor_*/medical_*/civic_*/practice_*/prescriptions/prevention-
-- staff/team_*) sind vertagt — im geschlossenen Pilot existieren keine solchen
-- Nutzer (außer dem nicht-löschbaren Founder). Der Lösch-Service schlägt fail-loud
-- fehl, falls ein nicht abgedeckter FK blockiert (kein Silent-Success).
--
-- File-first: Diese Datei wird vor schema_migrations-Insert committet. Prod-Apply +
-- Merge = Founder-Go (rote Zone). Idempotent (mehrfach ausführbar).

-- ============================================================
-- Schritt 1 — Aktor-Spalten nullable machen (für ON DELETE SET NULL)
-- ============================================================
ALTER TABLE public.care_documents          ALTER COLUMN generated_by    DROP NOT NULL;
ALTER TABLE public.care_audit_log          ALTER COLUMN actor_id        DROP NOT NULL;
ALTER TABLE public.groups                  ALTER COLUMN creator_id      DROP NOT NULL;
ALTER TABLE public.user_memory_audit_log   ALTER COLUMN actor_user_id   DROP NOT NULL;
ALTER TABLE public.user_memory_audit_log   ALTER COLUMN target_user_id  DROP NOT NULL;
ALTER TABLE public.pflegegrad_assessments  ALTER COLUMN assessor_id     DROP NOT NULL;
ALTER TABLE public.admin_audit_log         ALTER COLUMN admin_id        DROP NOT NULL;
ALTER TABLE public.audit_log               ALTER COLUMN actor_id        DROP NOT NULL;
ALTER TABLE public.org_audit_log           ALTER COLUMN user_id         DROP NOT NULL;
ALTER TABLE public.invite_codes            ALTER COLUMN created_by      DROP NOT NULL;

-- ============================================================
-- Schritt 2 — care_audit_log-Trigger GDPR-fähig machen
-- ============================================================
-- Der Trigger no_audit_delete/no_audit_update blockt jede Änderung an care_audit_log
-- (Audit-Integrität). Eine DSGVO-Löschung ist ein legitimer Grund — sie wird per
-- transaktionslokaler Session-Variable app.gdpr_delete='on' freigeschaltet, die nur
-- gdpr_delete_user() setzt. Normale Schreibpfade bleiben weiterhin geblockt.
CREATE OR REPLACE FUNCTION public.prevent_audit_modification()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF current_setting('app.gdpr_delete', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD); -- DELETE: NEW=NULL→OLD; UPDATE: NEW
  END IF;
  RAISE EXCEPTION 'care_audit_log: UPDATE und DELETE sind nicht erlaubt';
END;
$function$;

-- ============================================================
-- Schritt 3 — FK-delete_rule umstellen (idempotent, namensunabhängig)
-- ============================================================
DO $do$
DECLARE
  r RECORD;
  v_conname text;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      -- (child_table, child_column, parent_schema, rule)
      -- care_* Subjekt → CASCADE
      ('care_appointments','senior_id','public','CASCADE'),
      ('care_checkins','senior_id','public','CASCADE'),
      ('care_documents','senior_id','public','CASCADE'),
      ('care_helpers','user_id','public','CASCADE'),
      ('care_medication_logs','senior_id','public','CASCADE'),
      ('care_medications','senior_id','public','CASCADE'),
      ('care_shopping_requests','requester_id','public','CASCADE'),
      ('care_sos_alerts','senior_id','public','CASCADE'),
      ('care_sos_responses','helper_id','public','CASCADE'),
      ('care_tasks','creator_id','public','CASCADE'),
      ('care_visits','resident_id','public','CASCADE'),
      ('care_profiles_hilfe','user_id','auth','CASCADE'),
      ('care_audit_log','senior_id','public','CASCADE'),
      -- care_* Aktor → SET NULL
      ('care_appointments','managed_by','public','SET NULL'),
      ('care_documents','generated_by','public','SET NULL'),
      ('care_helpers','verified_by','public','SET NULL'),
      ('care_medications','managed_by','public','SET NULL'),
      ('care_shopping_requests','claimed_by','public','SET NULL'),
      ('care_sos_alerts','accepted_by','public','SET NULL'),
      ('care_sos_alerts','resolved_by','public','SET NULL'),
      ('care_tasks','claimed_by','public','SET NULL'),
      ('care_visits','caregiver_user_id','public','SET NULL'),
      ('care_audit_log','actor_id','public','SET NULL'),
      -- caregiver_links (public-FKs blockierten DELETE public.users)
      ('caregiver_links','resident_id','public','CASCADE'),
      ('caregiver_links','caregiver_id','public','CASCADE'),
      -- Gruppen
      ('group_members','user_id','public','CASCADE'),
      ('group_posts','user_id','public','CASCADE'),
      ('group_post_comments','user_id','public','CASCADE'),
      ('group_notification_settings','user_id','auth','CASCADE'),
      ('groups','creator_id','public','SET NULL'),
      -- Memory
      ('user_memory_audit_log','actor_user_id','auth','SET NULL'),
      ('user_memory_audit_log','target_user_id','auth','SET NULL'),
      ('user_memory_consents','granted_by','auth','SET NULL'),
      ('user_memory_facts','source_user_id','auth','SET NULL'),
      -- Einwilligungen / Notfallprofil / Konsultationen
      ('user_consents','user_id','auth','CASCADE'),
      ('emergency_profiles','user_id','public','CASCADE'),
      ('consultation_consents','user_id','public','CASCADE'),
      ('consultation_slots','host_user_id','public','SET NULL'),
      ('consultation_slots','booked_by','public','SET NULL'),
      ('consultation_slots','cancelled_by','auth','SET NULL'),
      ('consultation_slots','proposed_by','auth','SET NULL'),
      -- Pflegegrad / Plus-Trial / Helfer / Essen
      ('pflegegrad_assessments','user_id','public','CASCADE'),
      ('pflegegrad_assessments','assessor_id','public','SET NULL'),
      ('plus_trial_grants','caregiver_user_id','public','CASCADE'),
      ('neighborhood_helpers','user_id','auth','CASCADE'),
      ('helper_connections','resident_id','auth','CASCADE'),
      ('help_monthly_reports','resident_id','auth','CASCADE'),
      ('meal_signups','user_id','auth','CASCADE'),
      ('shared_meals','user_id','auth','CASCADE'),
      -- Sicherheits-/Audit-Logs → SET NULL (anonymisieren)
      ('security_events','user_id','public','SET NULL'),
      ('security_events','resolved_by','public','SET NULL'),
      ('admin_audit_log','admin_id','auth','SET NULL'),
      ('audit_log','actor_id','auth','SET NULL'),
      ('org_audit_log','user_id','auth','SET NULL'),
      ('org_audit_log','target_user_id','auth','SET NULL'),
      ('data_requests','admin_id','auth','SET NULL'),
      -- Ausleihe
      ('leihboerse_items','reserved_by','public','SET NULL'),
      -- Quartier / Invite
      ('quarters','created_by','public','SET NULL'),
      ('quarter_admins','assigned_by','public','SET NULL'),
      ('invite_codes','created_by','auth','SET NULL'),
      ('invite_codes','used_by','auth','SET NULL'),
      ('caregiver_invites','used_by','auth','SET NULL')
    ) AS t(tbl, col, parent_schema, rule)
  LOOP
    -- Bestehenden FK auf public.<tbl>.<col> → <parent_schema>.users(id) finden
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

    IF v_conname IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.tbl, v_conname);
    END IF;

    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I.users(id) ON DELETE %s',
      r.tbl, r.tbl || '_' || r.col || '_gdpr_fkey', r.col, r.parent_schema, r.rule
    );
  END LOOP;
END
$do$;

-- ============================================================
-- Schritt 4 — RPC gdpr_delete_user(uuid): einziger Lösch-Einstieg
-- ============================================================
-- Setzt die transaktionslokale GUC für den care_audit_log-Trigger und löscht
-- public.users. CASCADE räumt alle Subjekt-Daten, SET NULL anonymisiert Aktor-/
-- Log-Referenzen. Den auth.users-Eintrag (+ rein auth-seitige Tabellen) entfernt
-- der aufrufende Service danach via auth.admin.deleteUser().
CREATE OR REPLACE FUNCTION public.gdpr_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'gdpr_delete_user: target_user_id darf nicht NULL sein';
  END IF;
  -- Nur für diese Transaktion: care_audit_log-Löschung freischalten
  PERFORM set_config('app.gdpr_delete', 'on', true);
  DELETE FROM public.users WHERE id = target_user_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.gdpr_delete_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gdpr_delete_user(uuid) TO service_role;

COMMENT ON FUNCTION public.gdpr_delete_user(uuid) IS
  'DSGVO Art. 17: löscht public.users + alle CASCADE-Subjektdaten, anonymisiert Aktor-/Log-Referenzen. Nur service_role. auth.users separat via auth.admin.deleteUser.';
