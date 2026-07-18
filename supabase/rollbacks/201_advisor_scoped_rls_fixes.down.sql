-- Roll back advisor hardening package B to the previously observed broad policies.

BEGIN;

DROP TRIGGER IF EXISTS trigger_enforce_user_insert_restrictions ON public.users;
DROP FUNCTION IF EXISTS public.enforce_user_insert_restrictions();

CREATE OR REPLACE FUNCTION public.enforce_user_defaults()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.trust_level := 'new';
  NEW.is_admin := false;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_enforce_user_defaults
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_user_defaults();

DROP POLICY IF EXISTS "users_insert" ON public.users;
CREATE POLICY users_insert ON public.users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "neighbor_invitations_update" ON public.neighbor_invitations;
CREATE POLICY neighbor_invitations_update ON public.neighbor_invitations
  FOR UPDATE USING (true);

DO $$
BEGIN
  IF to_regclass('public.invoices') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "admin_insert_invoices" ON public.invoices';
    EXECUTE 'DROP POLICY IF EXISTS "admin_read_invoices" ON public.invoices';
    EXECUTE 'DROP POLICY IF EXISTS "admin_update_invoices" ON public.invoices';
    EXECUTE 'CREATE POLICY admin_insert_invoices ON public.invoices FOR INSERT WITH CHECK (true)';
    EXECUTE 'CREATE POLICY admin_read_invoices ON public.invoices FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY admin_update_invoices ON public.invoices FOR UPDATE USING (true)';
  END IF;
END;
$$;

DROP POLICY IF EXISTS "youth_profiles_insert_service" ON public.youth_profiles;
CREATE POLICY youth_profiles_insert_service ON public.youth_profiles FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "youth_earned_badges_insert_service" ON public.youth_earned_badges;
CREATE POLICY youth_earned_badges_insert_service ON public.youth_earned_badges FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "points_log_insert_service" ON public.points_log;
CREATE POLICY points_log_insert_service ON public.points_log FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "user_badges_insert_service" ON public.user_badges;
CREATE POLICY user_badges_insert_service ON public.user_badges FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "reputation_points_insert" ON public.reputation_points;
CREATE POLICY reputation_points_insert ON public.reputation_points FOR INSERT WITH CHECK (true);

DO $$
BEGIN
  IF to_regclass('public.passkey_challenges') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY passkey_challenges_insert ON public.passkey_challenges FOR INSERT WITH CHECK (true)';
    EXECUTE 'CREATE POLICY passkey_challenges_select ON public.passkey_challenges FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY passkey_challenges_delete ON public.passkey_challenges FOR DELETE USING (true)';
  END IF;
END;
$$;

CREATE POLICY user_blocks_service ON public.user_blocks FOR ALL USING (true);
CREATE POLICY warning_cache_service_insert ON public.warning_cache FOR INSERT WITH CHECK (true);
CREATE POLICY warning_cache_service_delete ON public.warning_cache FOR DELETE USING (true);
DO $$
BEGIN
  IF to_regclass('public.cron_job_runs') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY cron_job_runs_service ON public.cron_job_runs FOR ALL USING (true)';
  END IF;
END;
$$;
CREATE POLICY civic_audit_log_service_insert ON public.civic_audit_log FOR INSERT WITH CHECK (true);
CREATE POLICY civic_members_service_insert ON public.civic_members FOR INSERT WITH CHECK (true);
CREATE POLICY civic_messages_service_insert ON public.civic_messages FOR INSERT WITH CHECK (true);
CREATE POLICY civic_org_service_insert ON public.civic_organizations FOR INSERT WITH CHECK (true);

DO $$
BEGIN
  IF to_regclass('public.monthly_summaries') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "admin_all_summaries" ON public.monthly_summaries';
    EXECUTE 'CREATE POLICY admin_all_summaries ON public.monthly_summaries FOR ALL USING (true)';
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.business_settings') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "business_settings_admin_all" ON public.business_settings';
    EXECUTE 'CREATE POLICY "Service role full access on business_settings"
      ON public.business_settings FOR ALL USING (true) WITH CHECK (true)';
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.business_transactions') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "admin_insert_transactions" ON public.business_transactions';
    EXECUTE 'DROP POLICY IF EXISTS "admin_read_transactions" ON public.business_transactions';
    EXECUTE 'CREATE POLICY admin_insert_transactions ON public.business_transactions
      FOR INSERT WITH CHECK (true)';
    EXECUTE 'CREATE POLICY admin_read_transactions ON public.business_transactions
      FOR SELECT USING (true)';
  END IF;
END;
$$;

COMMIT;
