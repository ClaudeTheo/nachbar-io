-- Advisor hardening package B: replace broad write policies with scoped access.
-- File-first only. Production apply requires separate Founder-Go.

BEGIN;

-- RLS-1 (CRITICAL): a normal session may only create its own profile row.
-- The trigger prevents privilege-bearing columns from being supplied through
-- PostgREST. Family setup and registration use service_role and keep their
-- explicitly authorised server-side values.
DROP TRIGGER IF EXISTS trigger_enforce_user_defaults ON public.users;
DROP FUNCTION IF EXISTS public.enforce_user_defaults();

CREATE OR REPLACE FUNCTION public.enforce_user_insert_restrictions()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
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
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  NEW.is_admin := false;
  NEW.role := 'resident';
  NEW.trust_level := 'new';
  NEW.total_points := 0;
  NEW.points_level := 1;
  IF to_jsonb(NEW) ? 'doctor_verified_at' THEN
    NEW.doctor_verified_at := NULL;
  END IF;
  IF to_jsonb(NEW) ? 'doctor_verification_status' THEN
    NEW.doctor_verification_status := 'none';
  END IF;
  NEW.verified_by := NULL;
  NEW.verification_notes := NULL;
  IF to_jsonb(NEW) ? 'registered_by' THEN
    NEW.registered_by := NULL;
  END IF;
  IF to_jsonb(NEW) ? 'registered_by_role' THEN
    NEW.registered_by_role := NULL;
  END IF;
  NEW.deleted_at := NULL;
  NEW.retention_until := NULL;
  NEW.passkey_secret := NULL;
  IF to_jsonb(NEW) ? 'passkey_challenge' THEN
    NEW.passkey_challenge := NULL;
  END IF;
  IF to_jsonb(NEW) ? 'passkey_challenge_expires_at' THEN
    NEW.passkey_challenge_expires_at := NULL;
  END IF;

  NEW.settings := COALESCE(NEW.settings, '{}'::jsonb);
  FOREACH key IN ARRAY protected_keys
  LOOP
    NEW.settings := NEW.settings - key;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_enforce_user_insert_restrictions
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_user_insert_restrictions();

DROP POLICY IF EXISTS "users_insert" ON public.users;
CREATE POLICY users_insert ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- RLS-3: invite acceptance/expiry uses service_role. Authenticated inviters
-- may still update their own delivery metadata; platform admins retain access.
DROP POLICY IF EXISTS "neighbor_invitations_update" ON public.neighbor_invitations;
CREATE POLICY neighbor_invitations_update ON public.neighbor_invitations
  FOR UPDATE
  TO authenticated
  USING (inviter_id = auth.uid() OR public.is_admin())
  WITH CHECK (inviter_id = auth.uid() OR public.is_admin());

-- RLS-4: invoice data is service-written; cookie sessions are platform-admin only.
DO $$
BEGIN
  IF to_regclass('public.invoices') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "admin_insert_invoices" ON public.invoices';
    EXECUTE 'DROP POLICY IF EXISTS "admin_read_invoices" ON public.invoices';
    EXECUTE 'DROP POLICY IF EXISTS "admin_update_invoices" ON public.invoices';
    EXECUTE 'CREATE POLICY admin_insert_invoices ON public.invoices
      FOR INSERT TO authenticated WITH CHECK (public.is_admin())';
    EXECUTE 'CREATE POLICY admin_read_invoices ON public.invoices
      FOR SELECT TO authenticated USING (public.is_admin())';
    EXECUTE 'CREATE POLICY admin_update_invoices ON public.invoices
      FOR UPDATE TO authenticated USING (public.is_admin())
      WITH CHECK (public.is_admin())';
  END IF;
END;
$$;

-- RLS-5: current application services still write with the user's session.
-- Scope those writes to the caller's own row instead of breaking the flows.
DROP POLICY IF EXISTS "youth_profiles_insert_service" ON public.youth_profiles;
CREATE POLICY youth_profiles_insert_service ON public.youth_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "youth_earned_badges_insert_service" ON public.youth_earned_badges;
CREATE POLICY youth_earned_badges_insert_service ON public.youth_earned_badges
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "points_log_insert_service" ON public.points_log;
CREATE POLICY points_log_insert_service ON public.points_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_badges_insert_service" ON public.user_badges;
CREATE POLICY user_badges_insert_service ON public.user_badges
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "reputation_points_insert" ON public.reputation_points;
CREATE POLICY reputation_points_insert ON public.reputation_points
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS-6: passkey challenges are accessed only by the server-side admin client.
DO $$
BEGIN
  IF to_regclass('public.passkey_challenges') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "passkey_challenges_insert" ON public.passkey_challenges';
    EXECUTE 'DROP POLICY IF EXISTS "passkey_challenges_select" ON public.passkey_challenges';
    EXECUTE 'DROP POLICY IF EXISTS "passkey_challenges_delete" ON public.passkey_challenges';
  END IF;
END;
$$;

-- RLS-7: service_role bypasses RLS, so service-named true policies are unsafe
-- and unnecessary. Existing caller-scoped policies remain in place.
DROP POLICY IF EXISTS "user_blocks_service" ON public.user_blocks;
DROP POLICY IF EXISTS "warning_cache_service_insert" ON public.warning_cache;
DROP POLICY IF EXISTS "warning_cache_service_delete" ON public.warning_cache;
DO $$
BEGIN
  IF to_regclass('public.cron_job_runs') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "cron_job_runs_service" ON public.cron_job_runs';
  END IF;
END;
$$;
DROP POLICY IF EXISTS "civic_audit_log_service_insert" ON public.civic_audit_log;
DROP POLICY IF EXISTS "civic_members_service_insert" ON public.civic_members;
DROP POLICY IF EXISTS "civic_messages_service_insert" ON public.civic_messages;
DROP POLICY IF EXISTS "civic_org_service_insert" ON public.civic_organizations;

DO $$
BEGIN
  IF to_regclass('public.monthly_summaries') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "admin_all_summaries" ON public.monthly_summaries';
    EXECUTE 'CREATE POLICY admin_all_summaries ON public.monthly_summaries
      FOR ALL TO authenticated USING (public.is_admin())
      WITH CHECK (public.is_admin())';
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.business_settings') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access on business_settings" ON public.business_settings';
    EXECUTE 'CREATE POLICY business_settings_admin_all ON public.business_settings
      FOR ALL TO authenticated USING (public.is_admin())
      WITH CHECK (public.is_admin())';
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.business_transactions') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "admin_insert_transactions" ON public.business_transactions';
    EXECUTE 'DROP POLICY IF EXISTS "admin_read_transactions" ON public.business_transactions';
    EXECUTE 'CREATE POLICY admin_insert_transactions ON public.business_transactions
      FOR INSERT TO authenticated WITH CHECK (public.is_admin())';
    EXECUTE 'CREATE POLICY admin_read_transactions ON public.business_transactions
      FOR SELECT TO authenticated USING (public.is_admin())';
  END IF;
END;
$$;

COMMIT;
