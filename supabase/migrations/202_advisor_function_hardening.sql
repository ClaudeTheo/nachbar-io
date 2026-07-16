-- Advisor hardening package C: pin mutable search paths and remove API
-- execution grants from trigger/cron-only SECURITY DEFINER functions.

BEGIN;

ALTER FUNCTION public.assign_point_to_quarter(geometry, text, text, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.audit_hash_chain() SET search_path = public, pg_temp;
ALTER FUNCTION public.calculate_new_centroid(uuid, geometry) SET search_path = public, pg_temp;
ALTER FUNCTION public.care_update_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.check_max_radius(uuid, geometry, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_quarter_lifecycle() SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_expired_data() SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_old_heartbeats() SET search_path = public, pg_temp;
ALTER FUNCTION public.clear_alert_location() SET search_path = public, pg_temp;
ALTER FUNCTION public.enforce_caregiver_links_update_restrictions() SET search_path = public, pg_temp;
ALTER FUNCTION public.enforce_member_defaults() SET search_path = public, pg_temp;
ALTER FUNCTION public.enforce_user_update_restrictions() SET search_path = public, pg_temp;
ALTER FUNCTION public.enforce_youth_profiles_update_restrictions() SET search_path = public, pg_temp;
ALTER FUNCTION public.find_nearest_quarter_member(geometry, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.find_nearest_seeding_quarter(double precision, double precision, double precision) SET search_path = public, pg_temp;
ALTER FUNCTION public.find_quarter_containing_point(double precision, double precision) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_quarter_id() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_quarter_admin_for(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_super_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_verified_member() SET search_path = public, pg_temp;
ALTER FUNCTION public.prevent_audit_modification() SET search_path = public, pg_temp;
ALTER FUNCTION public.protect_auto_answer_senior_consent() SET search_path = public, pg_temp;
ALTER FUNCTION public.protect_plus_trial_end() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_quarter_boundary_circle(uuid, double precision) SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_household_quarter_id() SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_map_house_geo() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_map_houses_timestamp() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_memory_facts_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_tip_confirmation_count() SET search_path = public, pg_temp;
ALTER FUNCTION public.validate_house_in_quarter_boundary() SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.add_chat_group_creator_as_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_quarter_lifecycle() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_data() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_heartbeats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_chat_group_member_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_member_defaults() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_feature_flag_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_group_identity_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_group_member_identity_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_group_member_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_tip_confirmation_count() FROM PUBLIC, anon, authenticated;

COMMIT;
