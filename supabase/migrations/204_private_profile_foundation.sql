-- Migration 204: privates Profil- und Discovery-Fundament (Welle 3A)
--
-- ADDITIV: Bestehende users-Policies bleiben in dieser Migration unveraendert.
-- Fremde Consumer werden zuerst auf user_public_profiles umgestellt. Die
-- anschliessende users-RLS-Verengung erfolgt separat in Welle 3B.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Minimale, beziehungsgebundene Profilprojektion
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_public_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_public_profiles IS
  'Minimale Profilprojektion. Sichtbar nur fuer die eigene Person und explizite Kontakt-, Familien- oder Care-Beziehungen.';

INSERT INTO public.user_public_profiles (
  user_id,
  display_name,
  avatar_url,
  created_at,
  updated_at
)
SELECT
  id,
  display_name,
  avatar_url,
  created_at,
  now()
FROM public.users
ON CONFLICT (user_id) DO UPDATE
SET display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = now();

CREATE OR REPLACE FUNCTION public.sync_user_public_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.user_public_profiles (
    user_id,
    display_name,
    avatar_url,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.display_name,
    NEW.avatar_url,
    COALESCE(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      avatar_url = EXCLUDED.avatar_url,
      updated_at = now();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_user_public_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_user_public_profile() FROM anon;
REVOKE ALL ON FUNCTION public.sync_user_public_profile() FROM authenticated;

DROP TRIGGER IF EXISTS trg_sync_user_public_profile ON public.users;
CREATE TRIGGER trg_sync_user_public_profile
  AFTER INSERT OR UPDATE OF display_name, avatar_url
  ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_public_profile();

ALTER TABLE public.user_public_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_public_profiles_relationship_select
  ON public.user_public_profiles;
CREATE POLICY user_public_profiles_relationship_select
  ON public.user_public_profiles
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.contact_links cl
      WHERE cl.status = 'accepted'
        AND (
          (cl.requester_id = (SELECT auth.uid()) AND cl.addressee_id = user_public_profiles.user_id)
          OR
          (cl.addressee_id = (SELECT auth.uid()) AND cl.requester_id = user_public_profiles.user_id)
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.family_child_links fcl
      WHERE fcl.status = 'active'
        AND fcl.revoked_at IS NULL
        AND (
          (fcl.guardian_user_id = (SELECT auth.uid()) AND fcl.child_user_id = user_public_profiles.user_id)
          OR
          (fcl.child_user_id = (SELECT auth.uid()) AND fcl.guardian_user_id = user_public_profiles.user_id)
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.caregiver_links cgl
      WHERE cgl.consent_status = 'active'
        AND cgl.revoked_at IS NULL
        AND (
          (cgl.caregiver_id = (SELECT auth.uid()) AND cgl.resident_id = user_public_profiles.user_id)
          OR
          (cgl.resident_id = (SELECT auth.uid()) AND cgl.caregiver_id = user_public_profiles.user_id)
        )
    )
  );

REVOKE ALL ON public.user_public_profiles FROM PUBLIC;
REVOKE ALL ON public.user_public_profiles FROM anon;
REVOKE ALL ON public.user_public_profiles FROM authenticated;
GRANT SELECT ON public.user_public_profiles TO authenticated;
GRANT ALL ON public.user_public_profiles TO service_role;

-- PostgREST benoetigt eine explizite FK-Beziehung fuer eingebettete Profile.
-- NOT VALID verhindert, dass historische Auth/Public-Drift den additiven
-- Rollout blockiert; neue Zeilen werden dennoch geprueft.
DO $profile_fks$
DECLARE
  profile_fk record;
BEGIN
  FOR profile_fk IN
    SELECT *
    FROM (VALUES
      ('alerts', 'user_id', 'alerts_user_public_profile_fkey'),
      ('alert_responses', 'responder_user_id', 'alert_responses_public_profile_fkey'),
      ('board_comments', 'user_id', 'board_comments_user_public_profile_fkey'),
      ('care_helpers', 'user_id', 'care_helpers_user_public_profile_fkey'),
      ('caregiver_links', 'caregiver_id', 'caregiver_links_caregiver_public_profile_fkey'),
      ('care_shopping_requests', 'requester_id', 'care_shopping_requester_public_profile_fkey'),
      ('care_shopping_requests', 'claimed_by', 'care_shopping_claimer_public_profile_fkey'),
      ('care_sos_alerts', 'senior_id', 'care_sos_senior_public_profile_fkey'),
      ('care_sos_responses', 'helper_id', 'care_sos_helper_public_profile_fkey'),
      ('care_tasks', 'creator_id', 'care_tasks_creator_public_profile_fkey'),
      ('care_tasks', 'claimed_by', 'care_tasks_claimer_public_profile_fkey'),
      ('community_tips', 'user_id', 'community_tips_user_public_profile_fkey'),
      ('craftsman_recommendations', 'user_id', 'craftsman_recs_user_public_profile_fkey'),
      ('event_participants', 'user_id', 'event_participants_user_public_profile_fkey'),
      ('events', 'user_id', 'events_user_public_profile_fkey'),
      ('expert_endorsements', 'endorser_user_id', 'expert_endorsements_public_profile_fkey'),
      ('expert_reviews', 'reviewer_user_id', 'expert_reviews_public_profile_fkey'),
      ('group_members', 'user_id', 'group_members_user_public_profile_fkey'),
      ('group_post_comments', 'user_id', 'group_comments_user_public_profile_fkey'),
      ('group_posts', 'user_id', 'group_posts_user_public_profile_fkey'),
      ('help_requests', 'user_id', 'help_requests_user_public_profile_fkey'),
      ('help_responses', 'responder_user_id', 'help_responses_public_profile_fkey'),
      ('household_members', 'user_id', 'household_members_user_public_profile_fkey'),
      ('leihboerse_items', 'user_id', 'leihboerse_user_public_profile_fkey'),
      ('lost_found', 'user_id', 'lost_found_user_public_profile_fkey'),
      ('marketplace_items', 'user_id', 'marketplace_user_public_profile_fkey'),
      ('municipal_report_comments', 'user_id', 'report_comments_user_public_profile_fkey'),
      ('paketannahme', 'user_id', 'paketannahme_user_public_profile_fkey'),
      ('polls', 'user_id', 'polls_user_public_profile_fkey'),
      ('prevention_courses', 'instructor_id', 'prevention_courses_public_profile_fkey'),
      ('prevention_enrollments', 'user_id', 'prevention_enrollments_public_profile_fkey'),
      ('prevention_messages', 'sender_id', 'prevention_messages_sender_public_profile_fkey'),
      ('prevention_messages', 'recipient_id', 'prevention_messages_recipient_public_profile_fkey'),
      ('shared_meals', 'user_id', 'shared_meals_user_public_profile_fkey'),
      ('skills', 'user_id', 'skills_user_public_profile_fkey'),
      ('tip_reviews', 'user_id', 'tip_reviews_user_public_profile_fkey')
    ) AS profile_fks(table_name, column_name, constraint_name)
  LOOP
    IF to_regclass(format('public.%I', profile_fk.table_name)) IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = profile_fk.table_name
          AND c.column_name = profile_fk.column_name
      )
      AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint pc
        WHERE pc.conname = profile_fk.constraint_name
          AND pc.conrelid = to_regclass(format('public.%I', profile_fk.table_name))
      )
    THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.user_public_profiles(user_id) NOT VALID',
        profile_fk.table_name,
        profile_fk.constraint_name,
        profile_fk.column_name
      );
    END IF;
  END LOOP;
END;
$profile_fks$;

-- ---------------------------------------------------------------------------
-- 2) Private Discovery-Einstellungen (keine Fremdsuche in Welle 3A)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.discovery_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE
    DEFAULT auth.uid(),
  quarter_id uuid NOT NULL REFERENCES public.quarters(id) ON DELETE RESTRICT,
  discoverable boolean NOT NULL DEFAULT false,
  intro_text text CHECK (intro_text IS NULL OR char_length(intro_text) <= 140),
  adult_attested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT discovery_profiles_adult_opt_in
    CHECK (NOT discoverable OR adult_attested_at IS NOT NULL)
);

COMMENT ON TABLE public.discovery_profiles IS
  'Private Discovery-Einstellungen. Fremdzugriff und Such-RPCs folgen fruehestens in Welle 5.';
COMMENT ON COLUMN public.discovery_profiles.id IS
  'Zufaellige, opake Discovery-ID; die interne user_id wird Browser-Clients nicht als Spalte freigegeben.';
COMMENT ON COLUMN public.discovery_profiles.adult_attested_at IS
  'Serverseitig gesetzter Volljaehrigkeitsnachweis; fuer Browser-Clients unveraenderlich.';

CREATE OR REPLACE FUNCTION public.protect_discovery_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  authenticated_user_id uuid := auth.uid();
  verified_quarter_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.user_id := OLD.user_id;
    NEW.updated_at := now();
  END IF;

  IF authenticated_user_id IS NOT NULL THEN
    SELECT h.quarter_id
    INTO verified_quarter_id
    FROM public.household_members hm
    JOIN public.households h ON h.id = hm.household_id
    WHERE hm.user_id = authenticated_user_id
      AND hm.verified_at IS NOT NULL
      AND h.verified = true
      AND h.quarter_id IS NOT NULL
    ORDER BY hm.created_at ASC
    LIMIT 1;

    IF verified_quarter_id IS NULL THEN
      RAISE EXCEPTION 'Discovery-Profil erfordert eine verifizierte Quartiersmitgliedschaft'
        USING ERRCODE = '42501';
    END IF;

    NEW.user_id := authenticated_user_id;
    NEW.quarter_id := verified_quarter_id;

    IF TG_OP = 'INSERT' THEN
      NEW.adult_attested_at := NULL;
    ELSE
      NEW.adult_attested_at := OLD.adult_attested_at;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_discovery_profile_fields() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_discovery_profile_fields() FROM anon;
REVOKE ALL ON FUNCTION public.protect_discovery_profile_fields() FROM authenticated;

DROP TRIGGER IF EXISTS trg_protect_discovery_profile_fields
  ON public.discovery_profiles;
CREATE TRIGGER trg_protect_discovery_profile_fields
  BEFORE INSERT OR UPDATE
  ON public.discovery_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_discovery_profile_fields();

ALTER TABLE public.discovery_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY discovery_profiles_owner_select
  ON public.discovery_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY discovery_profiles_owner_insert
  ON public.discovery_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.household_members hm
      JOIN public.households h ON h.id = hm.household_id
      WHERE hm.user_id = (SELECT auth.uid())
        AND hm.verified_at IS NOT NULL
        AND h.verified = true
        AND h.quarter_id = discovery_profiles.quarter_id
    )
  );

CREATE POLICY discovery_profiles_owner_update
  ON public.discovery_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.household_members hm
      JOIN public.households h ON h.id = hm.household_id
      WHERE hm.user_id = (SELECT auth.uid())
        AND hm.verified_at IS NOT NULL
        AND h.verified = true
        AND h.quarter_id = discovery_profiles.quarter_id
    )
  );

CREATE POLICY discovery_profiles_owner_delete
  ON public.discovery_profiles
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON public.discovery_profiles FROM PUBLIC;
REVOKE ALL ON public.discovery_profiles FROM anon;
REVOKE ALL ON public.discovery_profiles FROM authenticated;
GRANT SELECT (
  id,
  quarter_id,
  discoverable,
  intro_text,
  adult_attested_at,
  created_at,
  updated_at
) ON public.discovery_profiles TO authenticated;
GRANT INSERT (
  discoverable,
  intro_text
) ON public.discovery_profiles TO authenticated;
GRANT UPDATE (
  discoverable,
  intro_text
) ON public.discovery_profiles TO authenticated;
GRANT DELETE ON public.discovery_profiles TO authenticated;
GRANT ALL ON public.discovery_profiles TO service_role;

COMMIT;
