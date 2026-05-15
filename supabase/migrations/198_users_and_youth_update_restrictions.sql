-- 198_users_and_youth_update_restrictions.sql
-- Privilege-Escalation-Schutz fuer users + youth_profiles
--
-- Hintergrund (Pass 63 Security-Audit 2026-05-15):
--   ADM-3 CRITICAL: Policy "users_update_own" (Mig 001:316) erlaubt UPDATE
--     auf ALLE Spalten, inkl. is_admin, role, trust_level, settings.
--     Reproduktion: await supabase.from('users').update({is_admin:true, role:'super_admin'}).eq('id', userId)
--   YOUTH-1 HIGH: Policy "youth_profiles_update_own" (Mig 094:37) erlaubt
--     UPDATE auf access_level. Ein Pilot-Youth kann eigene Restriktionen umgehen.
--
-- Fix: BEFORE-UPDATE-Trigger, die NEW privilege-Spalten auf OLD-Werte zwingen,
--   ausser bei service_role-Calls. Keine SECURITY-DEFINER-Funktion noetig:
--   der Trigger liest keine Tabellen und braucht keine erhoehten Rechte.
--
-- File-first. Founder-Go: MIGRATION-PROD-GO-198.
-- Rollback: supabase/rollbacks/198_users_and_youth_update_restrictions.down.sql

-- ============================================================================
-- 1. users-Tabelle: Privilege-Spalten und Schutz-Settings-Keys
-- ============================================================================

CREATE OR REPLACE FUNCTION enforce_user_update_restrictions()
RETURNS trigger AS $$
DECLARE
  caller_role text;
  protected_keys text[] := ARRAY[
    'youth_restrictions',
    'youth_registration_status',
    'youth_guardian_confirmation',
    'pilot_approval_status',
    'pilot_role',
    'pilot_identity',
    'is_test_user',
    'test_user_kind',
    'must_delete_before_pilot'
  ];
  key text;
BEGIN
  caller_role := current_setting('role', true);

  -- service_role darf alles (Admin-Routen, Migrations, Cron-Jobs)
  IF caller_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Privilege-Spalten: User darf NICHT veraendern
  NEW.is_admin := OLD.is_admin;
  NEW.role := OLD.role;
  NEW.trust_level := OLD.trust_level;

  -- ui_mode sticky bei youth (verhindert Youth → active/comfort/senior Bypass)
  IF OLD.ui_mode = 'youth' THEN
    NEW.ui_mode := 'youth';
  END IF;

  -- Schutz-Keys in settings (jsonb) als sticky behandeln
  IF NEW.settings IS DISTINCT FROM OLD.settings THEN
    IF NEW.settings IS NULL THEN
      NEW.settings := '{}'::jsonb;
    END IF;
    FOREACH key IN ARRAY protected_keys
    LOOP
      IF OLD.settings ? key THEN
        NEW.settings := jsonb_set(NEW.settings, ARRAY[key], OLD.settings->key, true);
      ELSE
        NEW.settings := NEW.settings - key;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION enforce_user_update_restrictions IS
  'Pass 63 Audit (ADM-3): blockiert User-Self-Update auf privilege-relevante Spalten und Settings-Keys. service_role bypassed.';

DROP TRIGGER IF EXISTS trg_users_update_restrictions ON users;
CREATE TRIGGER trg_users_update_restrictions
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION enforce_user_update_restrictions();

-- ============================================================================
-- 2. youth_profiles-Tabelle: alle Spalten ausser updated_at sticky
-- ============================================================================

CREATE OR REPLACE FUNCTION enforce_youth_profiles_update_restrictions()
RETURNS trigger AS $$
DECLARE
  caller_role text;
BEGIN
  caller_role := current_setting('role', true);

  IF caller_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Alle Sicherheits-relevanten Spalten sticky
  NEW.access_level := OLD.access_level;
  NEW.age_group := OLD.age_group;
  NEW.birth_year := OLD.birth_year;
  NEW.quarter_id := OLD.quarter_id;
  NEW.phone_hash := OLD.phone_hash;
  NEW.user_id := OLD.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION enforce_youth_profiles_update_restrictions IS
  'Pass 63 Audit (YOUTH-1): blockiert User-Self-Update auf youth_profiles. Nur service_role darf access_level/age_group aendern.';

DROP TRIGGER IF EXISTS trg_youth_profiles_update_restrictions ON youth_profiles;
CREATE TRIGGER trg_youth_profiles_update_restrictions
  BEFORE UPDATE ON youth_profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_youth_profiles_update_restrictions();
