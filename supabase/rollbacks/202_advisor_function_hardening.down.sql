-- Roll back advisor hardening package C to mutable search paths and prior grants.

BEGIN;

DO $$
DECLARE
  function_signature text;
  pinned_signatures text[] := ARRAY[
    'public.assign_point_to_quarter(geometry, text, text, text, text)',
    'public.audit_hash_chain()',
    'public.calculate_new_centroid(uuid, geometry)',
    'public.care_update_updated_at()',
    'public.check_max_radius(uuid, geometry, integer)',
    'public.check_quarter_lifecycle()',
    'public.cleanup_expired_data()',
    'public.cleanup_old_heartbeats()',
    'public.clear_alert_location()',
    'public.enforce_caregiver_links_update_restrictions()',
    'public.enforce_member_defaults()',
    'public.enforce_user_update_restrictions()',
    'public.enforce_youth_profiles_update_restrictions()',
    'public.find_nearest_quarter_member(geometry, integer)',
    'public.find_nearest_seeding_quarter(double precision, double precision, double precision)',
    'public.find_quarter_containing_point(double precision, double precision)',
    'public.get_user_quarter_id()',
    'public.is_admin()',
    'public.is_quarter_admin_for(uuid)',
    'public.is_super_admin()',
    'public.is_verified_member()',
    'public.prevent_audit_modification()',
    'public.protect_auto_answer_senior_consent()',
    'public.protect_plus_trial_end()',
    'public.set_quarter_boundary_circle(uuid, double precision)',
    'public.sync_household_quarter_id()',
    'public.sync_map_house_geo()',
    'public.update_map_houses_timestamp()',
    'public.update_memory_facts_updated_at()',
    'public.update_tip_confirmation_count()',
    'public.validate_house_in_quarter_boundary()'
  ];
  revoked_signatures text[] := ARRAY[
    'public.add_chat_group_creator_as_admin()',
    'public.check_quarter_lifecycle()',
    'public.cleanup_expired_data()',
    'public.cleanup_old_heartbeats()',
    'public.enforce_chat_group_member_limit()',
    'public.enforce_member_defaults()',
    'public.handle_new_user()',
    'public.log_feature_flag_change()',
    'public.prevent_group_identity_change()',
    'public.prevent_group_member_identity_change()',
    'public.refresh_group_member_count()',
    'public.update_tip_confirmation_count()'
  ];
BEGIN
  FOREACH function_signature IN ARRAY pinned_signatures
  LOOP
    IF to_regprocedure(function_signature) IS NOT NULL THEN
      EXECUTE format(
        'ALTER FUNCTION %s RESET search_path',
        function_signature
      );
    END IF;
  END LOOP;

  FOREACH function_signature IN ARRAY revoked_signatures
  LOOP
    IF to_regprocedure(function_signature) IS NOT NULL THEN
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION %s TO PUBLIC, anon, authenticated',
        function_signature
      );
    END IF;
  END LOOP;
END;
$$;

COMMIT;
