-- Rollback fuer Migration 204_private_profile_foundation.sql

BEGIN;

DO $profile_fks$
DECLARE
  profile_fk record;
BEGIN
  FOR profile_fk IN
    SELECT *
    FROM (VALUES
      ('alerts', 'alerts_user_public_profile_fkey'),
      ('alert_responses', 'alert_responses_public_profile_fkey'),
      ('board_comments', 'board_comments_user_public_profile_fkey'),
      ('care_helpers', 'care_helpers_user_public_profile_fkey'),
      ('caregiver_links', 'caregiver_links_caregiver_public_profile_fkey'),
      ('care_shopping_requests', 'care_shopping_requester_public_profile_fkey'),
      ('care_shopping_requests', 'care_shopping_claimer_public_profile_fkey'),
      ('care_sos_alerts', 'care_sos_senior_public_profile_fkey'),
      ('care_sos_responses', 'care_sos_helper_public_profile_fkey'),
      ('care_tasks', 'care_tasks_creator_public_profile_fkey'),
      ('care_tasks', 'care_tasks_claimer_public_profile_fkey'),
      ('community_tips', 'community_tips_user_public_profile_fkey'),
      ('craftsman_recommendations', 'craftsman_recs_user_public_profile_fkey'),
      ('event_participants', 'event_participants_user_public_profile_fkey'),
      ('events', 'events_user_public_profile_fkey'),
      ('expert_endorsements', 'expert_endorsements_public_profile_fkey'),
      ('expert_reviews', 'expert_reviews_public_profile_fkey'),
      ('group_members', 'group_members_user_public_profile_fkey'),
      ('group_post_comments', 'group_comments_user_public_profile_fkey'),
      ('group_posts', 'group_posts_user_public_profile_fkey'),
      ('help_requests', 'help_requests_user_public_profile_fkey'),
      ('help_responses', 'help_responses_public_profile_fkey'),
      ('household_members', 'household_members_user_public_profile_fkey'),
      ('leihboerse_items', 'leihboerse_user_public_profile_fkey'),
      ('lost_found', 'lost_found_user_public_profile_fkey'),
      ('marketplace_items', 'marketplace_user_public_profile_fkey'),
      ('municipal_report_comments', 'report_comments_user_public_profile_fkey'),
      ('paketannahme', 'paketannahme_user_public_profile_fkey'),
      ('polls', 'polls_user_public_profile_fkey'),
      ('prevention_courses', 'prevention_courses_public_profile_fkey'),
      ('prevention_enrollments', 'prevention_enrollments_public_profile_fkey'),
      ('prevention_messages', 'prevention_messages_sender_public_profile_fkey'),
      ('prevention_messages', 'prevention_messages_recipient_public_profile_fkey'),
      ('shared_meals', 'shared_meals_user_public_profile_fkey'),
      ('skills', 'skills_user_public_profile_fkey'),
      ('tip_reviews', 'tip_reviews_user_public_profile_fkey')
    ) AS profile_fks(table_name, constraint_name)
  LOOP
    IF to_regclass(format('public.%I', profile_fk.table_name)) IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I',
        profile_fk.table_name,
        profile_fk.constraint_name
      );
    END IF;
  END LOOP;
END;
$profile_fks$;

DROP TRIGGER IF EXISTS trg_protect_discovery_profile_fields
  ON public.discovery_profiles;
DROP TABLE IF EXISTS public.discovery_profiles;
DROP FUNCTION IF EXISTS public.protect_discovery_profile_fields();

DROP TRIGGER IF EXISTS trg_sync_user_public_profile ON public.users;
DROP TABLE IF EXISTS public.user_public_profiles;
DROP FUNCTION IF EXISTS public.sync_user_public_profile();

COMMIT;
