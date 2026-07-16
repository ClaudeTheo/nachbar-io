-- Roll back advisor hardening package C to mutable search paths and prior grants.

BEGIN;

ALTER FUNCTION public.assign_point_to_quarter(geometry, text, text, text, text) RESET search_path;
ALTER FUNCTION public.audit_hash_chain() RESET search_path;
ALTER FUNCTION public.calculate_new_centroid(uuid, geometry) RESET search_path;
ALTER FUNCTION public.care_update_updated_at() RESET search_path;
ALTER FUNCTION public.check_max_radius(uuid, geometry, integer) RESET search_path;
ALTER FUNCTION public.check_quarter_lifecycle() RESET search_path;
ALTER FUNCTION public.cleanup_expired_data() RESET search_path;
ALTER FUNCTION public.cleanup_old_heartbeats() RESET search_path;
ALTER FUNCTION public.clear_alert_location() RESET search_path;
ALTER FUNCTION public.enforce_caregiver_links_update_restrictions() RESET search_path;
ALTER FUNCTION public.enforce_member_defaults() RESET search_path;
ALTER FUNCTION public.enforce_user_update_restrictions() RESET search_path;
ALTER FUNCTION public.enforce_youth_profiles_update_restrictions() RESET search_path;
ALTER FUNCTION public.find_nearest_quarter_member(geometry, integer) RESET search_path;
ALTER FUNCTION public.find_nearest_seeding_quarter(double precision, double precision, double precision) RESET search_path;
ALTER FUNCTION public.find_quarter_containing_point(double precision, double precision) RESET search_path;
ALTER FUNCTION public.get_user_quarter_id() RESET search_path;
ALTER FUNCTION public.is_admin() RESET search_path;
ALTER FUNCTION public.is_quarter_admin_for(uuid) RESET search_path;
ALTER FUNCTION public.is_super_admin() RESET search_path;
ALTER FUNCTION public.is_verified_member() RESET search_path;
ALTER FUNCTION public.prevent_audit_modification() RESET search_path;
ALTER FUNCTION public.protect_auto_answer_senior_consent() RESET search_path;
ALTER FUNCTION public.protect_plus_trial_end() RESET search_path;
ALTER FUNCTION public.set_quarter_boundary_circle(uuid, double precision) RESET search_path;
ALTER FUNCTION public.sync_household_quarter_id() RESET search_path;
ALTER FUNCTION public.sync_map_house_geo() RESET search_path;
ALTER FUNCTION public.update_map_houses_timestamp() RESET search_path;
ALTER FUNCTION public.update_memory_facts_updated_at() RESET search_path;
ALTER FUNCTION public.update_tip_confirmation_count() RESET search_path;
ALTER FUNCTION public.validate_house_in_quarter_boundary() RESET search_path;

GRANT EXECUTE ON FUNCTION public.add_chat_group_creator_as_admin() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_quarter_lifecycle() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_data() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_heartbeats() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_chat_group_member_limit() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_member_defaults() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_feature_flag_change() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_group_identity_change() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_group_member_identity_change() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_group_member_count() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_tip_confirmation_count() TO PUBLIC, anon, authenticated;

COMMIT;
