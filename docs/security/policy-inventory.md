# Policy-Inventar (generiert)

> **NICHT von Hand editieren.** Generiert via `node scripts/generate-policy-inventory.mjs`
> aus dem lokalen Supabase-Stack (= Migrations-Replay-Stand, NICHT zwingend Prod — siehe
> Schema-Baseline-Konzept `docs/plans/2026-07-04-schema-baseline-konzept.md`).
> Inventar immer nach `supabase db reset` generieren (nicht nach blossem `start`), sonst spiegelt es einen veralteten Stack.
> Nach jeder Migration mit Policy-/Trigger-/Grant-Bezug neu generieren und einchecken —
> der Git-Diff dieser Datei IST das Security-Review-Artefakt.

Kennzahlen: **570 Policies** · 208 public-Tabellen (1 OHNE RLS) · 36 Trigger · 628 Grant-Zeilen

## ⚠️ Tabellen ohne RLS (public)

| Tabelle | RLS | forced |
|---|---|---|
| public.spatial_ref_sys | AUS | nein |


## RLS-Policies (effektiv)

| Tabelle | Policy | Cmd | Rollen | USING (gekuerzt) | WITH CHECK (gekuerzt) |
|---|---|---|---|---|---|
| public.admin_access_logs | service_role_only | ALL | public | (auth.role() = 'service_role'::text) |
| public.alert_responses | alert_responses_quarter_delete | DELETE | public | (is_super_admin() OR (EXISTS ( SELECT 1 FROM alerts a WHERE ((a.id = alert_responses.alert_id) AND is_quarter_admin_for(a.quarter_id))))) |
| public.alert_responses | alert_responses_quarter_insert | INSERT | public |  | ((responder_user_id = auth.uid()) AND (EXISTS ( SELECT 1 FROM alerts a WHERE ((a.id = alert_responses.alert_id) AND ((a.quarter_id = get_user_quarter_id()) OR i |
| public.alert_responses | alert_responses_quarter_select | SELECT | public | (EXISTS ( SELECT 1 FROM alerts a WHERE ((a.id = alert_responses.alert_id) AND ((a.quarter_id = get_user_quarter_id()) OR is_super_admin() OR is_quarter_admin_fo |
| public.alert_responses | alert_responses_quarter_update | UPDATE | public | ((responder_user_id = auth.uid()) OR is_super_admin() OR (EXISTS ( SELECT 1 FROM alerts a WHERE ((a.id = alert_responses.alert_id) AND is_quarter_admin_for(a.qu |
| public.alerts | alerts_quarter_delete | DELETE | public | (is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.alerts | alerts_quarter_insert | INSERT | public |  | ((quarter_id = get_user_quarter_id()) OR is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.alerts | alerts_quarter_select | SELECT | public | ((quarter_id = get_user_quarter_id()) OR is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.alerts | alerts_quarter_update | UPDATE | public | (((user_id = auth.uid()) AND (quarter_id = get_user_quarter_id())) OR is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.amtsblatt_issues | amtsblatt_issues_admin | ALL | public | (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.is_admin = true)))) |
| public.amtsblatt_issues | amtsblatt_issues_select | SELECT | public | ((quarter_id IN ( SELECT h.quarter_id FROM (household_members hm JOIN households h ON ((h.id = hm.household_id))) WHERE (hm.user_id = auth.uid()))) OR (EXISTS ( |
| public.analytics_snapshots | analytics_snapshots_delete_deny | DELETE | public | false |
| public.analytics_snapshots | analytics_snapshots_insert_deny | INSERT | public |  | false |
| public.analytics_snapshots | analytics_snapshots_read_admin | SELECT | public | is_admin() |
| public.analytics_snapshots | analytics_snapshots_read_org_member | SELECT | public | (EXISTS ( SELECT 1 FROM (org_members om JOIN organizations o ON ((o.id = om.org_id))) WHERE ((om.user_id = auth.uid()) AND (analytics_snapshots.quarter_id = ANY |
| public.analytics_snapshots | analytics_snapshots_read_quarter_admin | SELECT | public | is_quarter_admin_for(quarter_id) |
| public.analytics_snapshots | analytics_snapshots_update_deny | UPDATE | public | false |
| public.anamnesis_forms | anamnesis_own | SELECT | public | ((doctor_id = auth.uid()) OR (patient_id = auth.uid())) |
| public.anamnesis_forms | anamnesis_patient_insert | INSERT | public |  | (patient_id = auth.uid()) |
| public.anamnesis_forms | anamnesis_token_access | SELECT | public | ((access_token IS NOT NULL) AND (status = 'pending'::text) AND ((expires_at IS NULL) OR (expires_at > now()))) |
| public.anamnesis_forms | anamnesis_token_submit | UPDATE | public | ((access_token IS NOT NULL) AND (status = 'pending'::text) AND ((expires_at IS NULL) OR (expires_at > now()))) | (status = 'submitted'::text) |
| public.anamnesis_templates | templates_doctor_delete | DELETE | public | (doctor_id = auth.uid()) |
| public.anamnesis_templates | templates_doctor_insert | INSERT | public |  | (doctor_id = auth.uid()) |
| public.anamnesis_templates | templates_doctor_read | SELECT | public | (doctor_id = auth.uid()) |
| public.anamnesis_templates | templates_doctor_update | UPDATE | public | (doctor_id = auth.uid()) |
| public.appointments | appointments_doctor_update | UPDATE | public | (doctor_id = auth.uid()) |
| public.appointments | appointments_doctor_write | INSERT | public |  | (doctor_id = auth.uid()) |
| public.appointments | appointments_own | SELECT | public | ((doctor_id = auth.uid()) OR (patient_id = auth.uid())) |
| public.appointments | appointments_patient_insert | INSERT | public |  | (patient_id = auth.uid()) |
| public.board_comments | board_comments_delete | DELETE | public | (user_id = auth.uid()) |
| public.board_comments | board_comments_insert | INSERT | public |  | (user_id = auth.uid()) |
| public.board_comments | board_comments_read | SELECT | public | (EXISTS ( SELECT 1 FROM ((help_requests hr JOIN households h ON ((h.quarter_id = hr.quarter_id))) JOIN household_members hm ON ((hm.household_id = h.id))) WHERE |
| public.bug_report_rate_limits | rate_limits_no_direct_access | ALL | public | false | false |
| public.bug_reports | bug_reports_admin_delete | DELETE | public | (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.is_admin = true)))) |
| public.bug_reports | bug_reports_admin_select | SELECT | public | (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.is_admin = true)))) |
| public.bug_reports | bug_reports_admin_update | UPDATE | public | (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.is_admin = true)))) |
| public.bug_reports | bug_reports_insert | INSERT | public |  | (((auth.uid() IS NOT NULL) AND (user_id = auth.uid()) AND (source = 'authenticated'::text)) OR ((user_id IS NULL) AND (source = 'anonymous'::text))) |
| public.bug_reports | bug_reports_select_own | SELECT | public | (auth.uid() = user_id) |
| public.business_transactions | admin_insert_transactions | INSERT | public |  | true |
| public.business_transactions | admin_read_transactions | SELECT | public | true |
| public.care_appointments | care_appt_delete | DELETE | public | ((managed_by = auth.uid()) OR (is_care_helper_for(senior_id) AND (care_helper_role(senior_id) = ANY (ARRAY['relative'::text, 'care_service'::text]))) OR is_admi |
| public.care_appointments | care_appt_insert | INSERT | public |  | ((senior_id = auth.uid()) OR (is_care_helper_for(senior_id) AND (care_helper_role(senior_id) = ANY (ARRAY['relative'::text, 'care_service'::text]))) OR is_admin |
| public.care_appointments | care_appt_select_admin | SELECT | public | is_admin() |
| public.care_appointments | care_appt_select_helper | SELECT | public | is_care_helper_for(senior_id) |
| public.care_appointments | care_appt_select_own | SELECT | public | (senior_id = auth.uid()) |
| public.care_appointments | care_appt_select_quarter | SELECT | public | ((visibility = 'quarter'::text) AND (EXISTS ( SELECT 1 FROM (household_members hm JOIN households h ON ((h.id = hm.household_id))) WHERE ((hm.user_id = auth.uid |
| public.care_appointments | care_appt_update | UPDATE | public | ((managed_by = auth.uid()) OR (is_care_helper_for(senior_id) AND (care_helper_role(senior_id) = ANY (ARRAY['relative'::text, 'care_service'::text]))) OR is_admi |
| public.care_audit_log | care_audit_insert_actor | INSERT | public |  | (actor_id = auth.uid()) |
| public.care_audit_log | care_audit_select_admin | SELECT | public | is_admin() |
| public.care_audit_log | care_audit_select_helper | SELECT | public | is_care_helper_for(senior_id) |
| public.care_audit_log | care_audit_select_own | SELECT | public | (senior_id = auth.uid()) |
| public.care_checkins | care_checkins_insert_own | INSERT | public |  | (senior_id = auth.uid()) |
| public.care_checkins | care_checkins_select_admin | SELECT | public | is_admin() |
| public.care_checkins | care_checkins_select_helper | SELECT | public | is_care_helper_for(senior_id) |
| public.care_checkins | care_checkins_select_own | SELECT | public | (senior_id = auth.uid()) |
| public.care_checkins | care_checkins_update | UPDATE | public | ((senior_id = auth.uid()) OR is_admin()) |
| public.care_consent_history | care_consent_history_admin_read | SELECT | public | (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.is_admin = true)))) |
| public.care_consent_history | care_consent_history_own_insert | INSERT | public |  | (auth.uid() = user_id) |
| public.care_consent_history | care_consent_history_own_read | SELECT | public | (auth.uid() = user_id) |
| public.care_consents | care_consents_admin_read | SELECT | public | (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.is_admin = true)))) |
| public.care_consents | care_consents_own | ALL | public | (auth.uid() = user_id) |
| public.care_documents | care_docs_insert | INSERT | public |  | ((is_care_helper_for(senior_id) AND (care_helper_role(senior_id) = ANY (ARRAY['relative'::text, 'care_service'::text]))) OR is_admin()) |
| public.care_documents | care_docs_select_admin | SELECT | public | is_admin() |
| public.care_documents | care_docs_select_helper | SELECT | public | is_care_helper_for(senior_id) |
| public.care_documents | care_docs_select_own | SELECT | public | (senior_id = auth.uid()) |
| public.care_helpers | care_helpers_insert_own | INSERT | public |  | (user_id = auth.uid()) |
| public.care_helpers | care_helpers_select | SELECT | public | is_verified_member() |
| public.care_helpers | care_helpers_update_admin | UPDATE | public | is_admin() |
| public.care_helpers | care_helpers_update_own | UPDATE | public | (user_id = auth.uid()) |
| public.care_medication_logs | care_med_logs_insert_own | INSERT | public |  | (senior_id = auth.uid()) |
| public.care_medication_logs | care_med_logs_select_admin | SELECT | public | is_admin() |
| public.care_medication_logs | care_med_logs_select_helper | SELECT | public | is_care_helper_for(senior_id) |
| public.care_medication_logs | care_med_logs_select_own | SELECT | public | (senior_id = auth.uid()) |
| public.care_medications | care_meds_insert | INSERT | public |  | ((senior_id = auth.uid()) OR (is_care_helper_for(senior_id) AND (care_helper_role(senior_id) = ANY (ARRAY['relative'::text, 'care_service'::text]))) OR is_admin |
| public.care_medications | care_meds_select_admin | SELECT | public | is_admin() |
| public.care_medications | care_meds_select_helper | SELECT | public | is_care_helper_for(senior_id) |
| public.care_medications | care_meds_select_own | SELECT | public | (senior_id = auth.uid()) |
| public.care_medications | care_meds_update | UPDATE | public | ((managed_by = auth.uid()) OR (is_care_helper_for(senior_id) AND (care_helper_role(senior_id) = ANY (ARRAY['relative'::text, 'care_service'::text]))) OR is_admi |
| public.care_profiles | care_profiles_insert_own | INSERT | public |  | (user_id = auth.uid()) |
| public.care_profiles | care_profiles_select_admin | SELECT | public | is_admin() |
| public.care_profiles | care_profiles_select_helper | SELECT | public | is_care_helper_for(user_id) |
| public.care_profiles | care_profiles_select_own | SELECT | public | (user_id = auth.uid()) |
| public.care_profiles | care_profiles_update_admin | UPDATE | public | is_admin() |
| public.care_profiles | care_profiles_update_helper | UPDATE | public | (is_care_helper_for(user_id) AND (care_helper_role(user_id) = ANY (ARRAY['relative'::text, 'care_service'::text]))) |
| public.care_profiles | care_profiles_update_own | UPDATE | public | (user_id = auth.uid()) |
| public.care_profiles_hilfe | care_profiles_hilfe_own | ALL | authenticated | (auth.uid() = user_id) | (auth.uid() = user_id) |
| public.care_shopping_requests | shopping_delete | DELETE | public | (((auth.uid() = requester_id) AND (status = 'open'::text)) OR is_admin()) |
| public.care_shopping_requests | shopping_insert_own | INSERT | public |  | (auth.uid() = requester_id) |
| public.care_shopping_requests | shopping_select_quarter | SELECT | public | (EXISTS ( SELECT 1 FROM (household_members hm JOIN households h ON ((h.id = hm.household_id))) WHERE ((hm.user_id = auth.uid()) AND (h.quarter_id = care_shoppin |
| public.care_shopping_requests | shopping_update | UPDATE | public | ((auth.uid() = requester_id) OR (auth.uid() = claimed_by) OR is_admin()) |
| public.care_sos_alerts | care_sos_alerts_quarter_delete | DELETE | public | (is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.care_sos_alerts | care_sos_alerts_quarter_insert | INSERT | public |  | ((senior_id = auth.uid()) AND ((quarter_id = get_user_quarter_id()) OR is_super_admin())) |
| public.care_sos_alerts | care_sos_alerts_quarter_select | SELECT | public | ((senior_id = auth.uid()) OR (is_care_helper_for(senior_id) AND (quarter_id = get_user_quarter_id())) OR is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.care_sos_alerts | care_sos_alerts_quarter_update | UPDATE | public | ((senior_id = auth.uid()) OR (is_care_helper_for(senior_id) AND (quarter_id = get_user_quarter_id())) OR is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.care_sos_responses | care_sos_resp_insert | INSERT | public |  | (helper_id = auth.uid()) |
| public.care_sos_responses | care_sos_resp_select | SELECT | public | ((helper_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM care_sos_alerts WHERE ((care_sos_alerts.id = care_sos_responses.sos_alert_id) AND ((care_sos_alerts.senior_ |
| public.care_subscriptions | care_sub_insert_own | INSERT | public |  | (user_id = auth.uid()) |
| public.care_subscriptions | care_sub_select_admin | SELECT | public | is_admin() |
| public.care_subscriptions | care_sub_select_own | SELECT | public | (user_id = auth.uid()) |
| public.care_subscriptions | care_sub_update_admin | UPDATE | public | is_admin() |
| public.care_subscriptions | care_sub_update_own | UPDATE | public | (user_id = auth.uid()) |
| public.care_tasks | tasks_delete | DELETE | public | (((auth.uid() = creator_id) AND (status = 'open'::text)) OR is_admin()) |
| public.care_tasks | tasks_insert | INSERT | public |  | (auth.uid() = creator_id) |
| public.care_tasks | tasks_select_quarter | SELECT | public | (EXISTS ( SELECT 1 FROM (household_members hm JOIN households h ON ((h.id = hm.household_id))) WHERE ((hm.user_id = auth.uid()) AND (h.quarter_id = care_tasks.q |
| public.care_tasks | tasks_update | UPDATE | public | ((auth.uid() = creator_id) OR (auth.uid() = claimed_by) OR is_admin()) |
| public.caregiver_invites | caregiver_invites_insert_own | INSERT | public |  | (auth.uid() = resident_id) |
| public.caregiver_invites | caregiver_invites_select_own | SELECT | public | (auth.uid() = resident_id) |
| public.caregiver_links | caregiver_links_select_caregiver | SELECT | public | ((auth.uid() = caregiver_id) AND (revoked_at IS NULL)) |
| public.caregiver_links | caregiver_links_select_resident | SELECT | public | (auth.uid() = resident_id) |
| public.caregiver_links | caregiver_links_update_resident | UPDATE | public | (auth.uid() = resident_id) | (auth.uid() = resident_id) |
| public.chat_group_members | cgm_delete | DELETE | public | (is_chat_group_admin(group_id, auth.uid()) OR (auth.uid() = user_id)) |
| public.chat_group_members | cgm_insert | INSERT | public |  | (((auth.uid() = user_id) AND (role = 'admin'::text) AND (NOT (EXISTS ( SELECT 1 FROM chat_group_members cgm2 WHERE (cgm2.group_id = chat_group_members.group_id) |
| public.chat_group_members | cgm_select | SELECT | public | is_chat_group_member(group_id, auth.uid()) |
| public.chat_group_members | cgm_update | UPDATE | public | (is_chat_group_admin(group_id, auth.uid()) OR (auth.uid() = user_id)) | (is_chat_group_admin(group_id, auth.uid()) OR ((auth.uid() = user_id) AND (role = 'member'::text))) |
| public.chat_group_messages | cgmsg_delete | DELETE | public | ((auth.uid() = sender_id) OR is_chat_group_admin(group_id, auth.uid())) |
| public.chat_group_messages | cgmsg_insert | INSERT | public |  | ((auth.uid() = sender_id) AND is_chat_group_member(group_id, auth.uid())) |
| public.chat_group_messages | cgmsg_select | SELECT | public | is_chat_group_member(group_id, auth.uid()) |
| public.chat_groups | cg_delete | DELETE | public | is_chat_group_admin(id, auth.uid()) |
| public.chat_groups | cg_insert | INSERT | public |  | (auth.uid() = created_by) |
| public.chat_groups | cg_select | SELECT | public | is_chat_group_member(id, auth.uid()) |
| public.chat_groups | cg_select_creator | SELECT | public | (created_by = auth.uid()) |
| public.chat_groups | cg_update | UPDATE | public | is_chat_group_admin(id, auth.uid()) | is_chat_group_admin(id, auth.uid()) |
| public.circle_events | circle_events_insert_caregiver | INSERT | public |  | (EXISTS ( SELECT 1 FROM caregiver_links WHERE ((caregiver_links.caregiver_id = auth.uid()) AND (caregiver_links.resident_id = circle_events.resident_id) AND (ca |
| public.circle_events | circle_events_insert_resident | INSERT | public |  | (auth.uid() = resident_id) |
| public.circle_events | circle_events_select_caregiver | SELECT | public | ((deleted_at IS NULL) AND (EXISTS ( SELECT 1 FROM caregiver_links WHERE ((caregiver_links.caregiver_id = auth.uid()) AND (caregiver_links.resident_id = circle_e |
| public.circle_events | circle_events_select_resident | SELECT | public | ((auth.uid() = resident_id) AND (deleted_at IS NULL)) |
| public.circle_events | circle_events_update_creator | UPDATE | public | (auth.uid() = created_by) | (auth.uid() = created_by) |
| public.citizen_reports | citizen_reports_insert | INSERT | public |  | (auth.uid() IS NOT NULL) |
| public.citizen_reports | citizen_reports_select | SELECT | public | (auth.uid() IS NOT NULL) |
| public.citizen_reports | citizen_reports_update | UPDATE | public | (org_id IN ( SELECT civic_members.org_id FROM civic_members WHERE ((civic_members.user_id = auth.uid()) AND (civic_members.role = ANY (ARRAY['civic_admin'::text |
| public.civic_announcements | civic_announcements_insert | INSERT | public |  | (org_id IN ( SELECT civic_members.org_id FROM civic_members WHERE ((civic_members.user_id = auth.uid()) AND (civic_members.role = ANY (ARRAY['civic_admin'::text |
| public.civic_announcements | civic_announcements_select | SELECT | public | ((target_quarters = '{}'::uuid[]) OR (( SELECT get_user_quarter_id() AS get_user_quarter_id) = ANY (target_quarters)) OR (org_id IN ( SELECT cm.org_id FROM civi |
| public.civic_announcements | civic_announcements_update | UPDATE | public | (org_id IN ( SELECT civic_members.org_id FROM civic_members WHERE ((civic_members.user_id = auth.uid()) AND (civic_members.role = ANY (ARRAY['civic_admin'::text |
| public.civic_appointments | civic_appointments_insert | INSERT | public |  | (auth.uid() IS NOT NULL) |
| public.civic_appointments | civic_appointments_select | SELECT | public | (auth.uid() IS NOT NULL) |
| public.civic_appointments | civic_appointments_update | UPDATE | public | (auth.uid() IS NOT NULL) |
| public.civic_audit_log | civic_audit_log_select | SELECT | public | (org_id IN ( SELECT civic_members.org_id FROM civic_members WHERE (civic_members.user_id = auth.uid()))) |
| public.civic_audit_log | civic_audit_log_service_insert | INSERT | public |  | true |
| public.civic_document_requests | civic_document_requests_insert | INSERT | public |  | (auth.uid() IS NOT NULL) |
| public.civic_document_requests | civic_document_requests_select | SELECT | public | (auth.uid() IS NOT NULL) |
| public.civic_document_requests | civic_document_requests_update | UPDATE | public | (auth.uid() IS NOT NULL) |
| public.civic_events | civic_events_insert | INSERT | public |  | (auth.uid() IS NOT NULL) |
| public.civic_events | civic_events_select | SELECT | public | (auth.uid() IS NOT NULL) |
| public.civic_members | civic_members_select_org | SELECT | public | (org_id IN ( SELECT civic_members_1.org_id FROM civic_members civic_members_1 WHERE ((civic_members_1.user_id = auth.uid()) AND (civic_members_1.role = 'civic_a |
| public.civic_members | civic_members_select_own | SELECT | public | (user_id = auth.uid()) |
| public.civic_members | civic_members_service_insert | INSERT | public |  | true |
| public.civic_message_attachments | citizen_read_own_attachments | SELECT | public | (EXISTS ( SELECT 1 FROM civic_messages cm WHERE ((cm.id = civic_message_attachments.message_id) AND (cm.citizen_user_id = auth.uid())))) |
| public.civic_message_attachments | service_insert_attachments | INSERT | public |  | (auth.role() = 'service_role'::text) |
| public.civic_message_attachments | staff_read_org_attachments | SELECT | public | (EXISTS ( SELECT 1 FROM (civic_messages cm JOIN civic_members cmem ON (((cmem.org_id = cm.org_id) AND (cmem.user_id = auth.uid())))) WHERE (cm.id = civic_messag |
| public.civic_messages | civic_messages_citizen_insert | INSERT | public |  | (citizen_user_id = auth.uid()) |
| public.civic_messages | civic_messages_citizen_select | SELECT | public | (citizen_user_id = auth.uid()) |
| public.civic_messages | civic_messages_service_insert | INSERT | public |  | true |
| public.civic_messages | civic_messages_staff_select | SELECT | public | (org_id IN ( SELECT civic_members.org_id FROM civic_members WHERE (civic_members.user_id = auth.uid()))) |
| public.civic_messages | civic_messages_staff_update | UPDATE | public | (org_id IN ( SELECT civic_members.org_id FROM civic_members WHERE (civic_members.user_id = auth.uid()))) | (org_id IN ( SELECT civic_members.org_id FROM civic_members WHERE (civic_members.user_id = auth.uid()))) |
| public.civic_organizations | civic_org_select | SELECT | public | (id IN ( SELECT civic_members.org_id FROM civic_members WHERE (civic_members.user_id = auth.uid()))) |
| public.civic_organizations | civic_org_service_insert | INSERT | public |  | true |
| public.civic_organizations | civic_org_update | UPDATE | public | (id IN ( SELECT civic_members.org_id FROM civic_members WHERE ((civic_members.user_id = auth.uid()) AND (civic_members.role = 'civic_admin'::text)))) |
| public.civic_survey_options | civic_survey_options_insert | INSERT | public |  | (auth.uid() IS NOT NULL) |
| public.civic_survey_options | civic_survey_options_select | SELECT | public | (auth.uid() IS NOT NULL) |
| public.civic_survey_votes | civic_survey_votes_insert | INSERT | public |  | (user_id = auth.uid()) |
| public.civic_survey_votes | civic_survey_votes_select | SELECT | public | (auth.uid() IS NOT NULL) |
| public.civic_surveys | civic_surveys_delete | DELETE | public | (created_by = auth.uid()) |
| public.civic_surveys | civic_surveys_insert | INSERT | public |  | (auth.uid() IS NOT NULL) |
| public.civic_surveys | civic_surveys_select | SELECT | public | (auth.uid() IS NOT NULL) |
| public.community_rules_violations | violations_admin | ALL | public | is_admin() |
| public.community_rules_violations | violations_create | INSERT | public |  | (is_verified_member() AND (reporter_user_id = auth.uid())) |
| public.community_rules_violations | violations_own | SELECT | public | (reporter_user_id = auth.uid()) |
| public.community_tips | tips_delete | DELETE | authenticated | (auth.uid() = user_id) |
| public.community_tips | tips_insert | INSERT | authenticated |  | ((auth.uid() = user_id) AND (EXISTS ( SELECT 1 FROM household_members hm WHERE ((hm.user_id = auth.uid()) AND (hm.verified_at IS NOT NULL))))) |
| public.community_tips | tips_select | SELECT | authenticated | (EXISTS ( SELECT 1 FROM household_members hm WHERE ((hm.user_id = auth.uid()) AND (hm.verified_at IS NOT NULL)))) |
| public.community_tips | tips_update | UPDATE | authenticated | (auth.uid() = user_id) | (auth.uid() = user_id) |
| public.consent_grants | consent_insert_subject | INSERT | public |  | (subject_id = auth.uid()) |
| public.consent_grants | consent_select_grantee | SELECT | public | ((grantee_id = auth.uid()) AND (revoked_at IS NULL)) |
| public.consent_grants | consent_select_org | SELECT | public | ((revoked_at IS NULL) AND (grantee_org_id IS NOT NULL) AND (EXISTS ( SELECT 1 FROM org_members om WHERE ((om.org_id = consent_grants.grantee_org_id) AND (om.use |
| public.consent_grants | consent_select_subject | SELECT | public | (subject_id = auth.uid()) |
| public.consent_grants | consent_update_revoke | UPDATE | public | (subject_id = auth.uid()) | (revoked_at IS NOT NULL) |
| public.consent_versions | consent_versions_read_auth | SELECT | public | (auth.uid() IS NOT NULL) |
| public.construction_sites | construction_sites_insert | INSERT | public |  | (org_id IN ( SELECT civic_members.org_id FROM civic_members WHERE ((civic_members.user_id = auth.uid()) AND (civic_members.role = ANY (ARRAY['civic_admin'::text |
| public.construction_sites | construction_sites_select | SELECT | public | (auth.uid() IS NOT NULL) |
| public.construction_sites | construction_sites_update | UPDATE | public | (org_id IN ( SELECT civic_members.org_id FROM civic_members WHERE ((civic_members.user_id = auth.uid()) AND (civic_members.role = ANY (ARRAY['civic_admin'::text |
| public.consultation_consents | consent_own | ALL | public | (user_id = auth.uid()) |
| public.consultation_slots | consultation_book_resident_v2 | UPDATE | public | ((booked_by IS NULL) AND (status = 'scheduled'::text) AND (quarter_id IN ( SELECT h.quarter_id FROM (household_members hm JOIN households h ON ((h.id = hm.house | (booked_by = auth.uid()) |
| public.consultation_slots | consultation_host_all | ALL | public | (host_user_id = auth.uid()) |
| public.consultation_slots | consultation_select_resident | SELECT | public | ((booked_by = auth.uid()) OR (host_user_id = auth.uid()) OR ((status = 'scheduled'::text) AND (booked_by IS NULL) AND (quarter_id IN ( SELECT h.quarter_id FROM |
| public.contact_links | contact_links_delete | DELETE | public | ((auth.uid() = addressee_id) OR (auth.uid() = requester_id)) |
| public.contact_links | contact_links_insert | INSERT | public |  | ((auth.uid() = requester_id) AND (requester_id <> addressee_id) AND (NOT (EXISTS ( SELECT 1 FROM contact_links cl WHERE ((cl.requester_id = contact_links.addres |
| public.contact_links | contact_links_select | SELECT | public | ((auth.uid() = requester_id) OR (auth.uid() = addressee_id)) |
| public.contact_links | contact_links_update_addressee | UPDATE | public | (auth.uid() = addressee_id) | (auth.uid() = addressee_id) |
| public.contact_links | contact_links_update_requester_cancel | UPDATE | public | ((auth.uid() = requester_id) AND (status = 'pending'::text)) | ((auth.uid() = requester_id) AND (status = ANY (ARRAY['pending'::text, 'rejected'::text]))) |
| public.content_reports | content_reports_admin_all | ALL | public | is_admin() |
| public.content_reports | content_reports_insert_own | INSERT | public |  | (auth.uid() = reporter_id) |
| public.content_reports | content_reports_select_own | SELECT | public | (auth.uid() = reporter_id) |
| public.conversations | conversations_contact_delete | DELETE | public | ((participant_1 = auth.uid()) OR (participant_2 = auth.uid())) |
| public.conversations | conversations_contact_insert | INSERT | public |  | (((participant_1 = auth.uid()) OR (participant_2 = auth.uid())) AND are_contacts(participant_1, participant_2)) |
| public.conversations | conversations_contact_select | SELECT | public | (((participant_1 = auth.uid()) OR (participant_2 = auth.uid())) AND are_contacts(participant_1, participant_2)) |
| public.conversations | conversations_contact_update | UPDATE | public | ((participant_1 = auth.uid()) OR (participant_2 = auth.uid())) | ((participant_1 = auth.uid()) OR (participant_2 = auth.uid())) |
| public.craftsman_recommendations | cr_delete | DELETE | public | (user_id = auth.uid()) |
| public.craftsman_recommendations | cr_insert | INSERT | public |  | ((user_id = auth.uid()) AND (EXISTS ( SELECT 1 FROM auth.users u WHERE ((u.id = auth.uid()) AND (u.created_at < (now() - '7 days'::interval))))) AND (NOT (EXIST |
| public.craftsman_recommendations | cr_read | SELECT | public | (EXISTS ( SELECT 1 FROM household_members hm WHERE ((hm.user_id = auth.uid()) AND (hm.verified_at IS NOT NULL)))) |
| public.craftsman_recommendations | cr_update | UPDATE | public | (user_id = auth.uid()) | (user_id = auth.uid()) |
| public.craftsman_usage_events | cue_delete | DELETE | public | (user_id = auth.uid()) |
| public.craftsman_usage_events | cue_insert | INSERT | public |  | (user_id = auth.uid()) |
| public.craftsman_usage_events | cue_read | SELECT | public | (EXISTS ( SELECT 1 FROM household_members hm WHERE ((hm.user_id = auth.uid()) AND (hm.verified_at IS NOT NULL)))) |
| public.crisis_alerts | crisis_alerts_insert | INSERT | public |  | (org_id IN ( SELECT civic_members.org_id FROM civic_members WHERE ((civic_members.user_id = auth.uid()) AND (civic_members.role = 'civic_admin'::text)))) |
| public.crisis_alerts | crisis_alerts_select | SELECT | public | (auth.uid() IS NOT NULL) |
| public.crisis_alerts | crisis_alerts_update | UPDATE | public | (org_id IN ( SELECT civic_members.org_id FROM civic_members WHERE ((civic_members.user_id = auth.uid()) AND (civic_members.role = 'civic_admin'::text)))) |
| public.crisis_templates | crisis_templates_select | SELECT | public | (auth.uid() IS NOT NULL) |
| public.cron_heartbeats | admins_can_read_heartbeats | SELECT | public | (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.is_admin = true)))) |
| public.cross_org_deliveries | deliveries_select | SELECT | public | ((target_org_id IN ( SELECT civic_members.org_id FROM civic_members WHERE (civic_members.user_id = auth.uid()))) OR (source_org_id IN ( SELECT civic_members.org |
| public.cross_org_requests | requests_insert | INSERT | public |  | (source_org_id IN ( SELECT civic_members.org_id FROM civic_members WHERE ((civic_members.user_id = auth.uid()) AND (civic_members.role = ANY (ARRAY['civic_admin |
| public.cross_org_requests | requests_select | SELECT | public | ((source_org_id IN ( SELECT civic_members.org_id FROM civic_members WHERE (civic_members.user_id = auth.uid()))) OR (target_org_id IN ( SELECT civic_members.org |
| public.cross_org_requests | requests_update | UPDATE | public | (target_org_id IN ( SELECT civic_members.org_id FROM civic_members WHERE ((civic_members.user_id = auth.uid()) AND (civic_members.role = 'civic_admin'::text)))) |
| public.data_breach_incidents | service_role_only | ALL | public | (auth.role() = 'service_role'::text) |
| public.data_requests | service_role_only | ALL | public | (auth.role() = 'service_role'::text) |
| public.device_heartbeats | device_heartbeats_select_admin | SELECT | public | is_admin() |
| public.device_refresh_tokens | users revoke own devices | UPDATE | public | (user_id = auth.uid()) | ((user_id = auth.uid()) AND (revoked_at IS NOT NULL)) |
| public.device_refresh_tokens | users see own devices | SELECT | public | (user_id = auth.uid()) |
| public.device_tokens | device_tokens_delete_household | DELETE | public | ((household_id IN ( SELECT household_members.household_id FROM household_members WHERE ((household_members.user_id = auth.uid()) AND (household_members.verified |
| public.device_tokens | device_tokens_insert_household | INSERT | public |  | ((household_id IN ( SELECT household_members.household_id FROM household_members WHERE ((household_members.user_id = auth.uid()) AND (household_members.verified |
| public.device_tokens | device_tokens_select_household | SELECT | public | ((household_id IN ( SELECT household_members.household_id FROM household_members WHERE ((household_members.user_id = auth.uid()) AND (household_members.verified |
| public.device_tokens | device_tokens_update_household | UPDATE | public | ((household_id IN ( SELECT household_members.household_id FROM household_members WHERE ((household_members.user_id = auth.uid()) AND (household_members.verified |
| public.direct_messages | dm_create | INSERT | public |  | ((sender_id = auth.uid()) AND (EXISTS ( SELECT 1 FROM conversations c WHERE ((c.id = direct_messages.conversation_id) AND ((c.participant_1 = auth.uid()) OR (c. |
| public.direct_messages | dm_read | SELECT | public | (EXISTS ( SELECT 1 FROM conversations c WHERE ((c.id = direct_messages.conversation_id) AND ((c.participant_1 = auth.uid()) OR (c.participant_2 = auth.uid())))) |
| public.doctor_consents | doctor_own_consents | ALL | public | (auth.uid() = user_id) |
| public.doctor_profiles | doctor_profiles_own_write | ALL | public | (user_id = auth.uid()) |
| public.doctor_profiles | doctor_profiles_public_read | SELECT | public | ((visible = true) OR (user_id = auth.uid())) |
| public.doctor_reviews | reviews_patient_write | INSERT | public |  | (patient_id = auth.uid()) |
| public.doctor_reviews | reviews_public_read | SELECT | public | (visible = true) |
| public.escalation_events | escalation_events_service_only | ALL | public | false |
| public.event_participants | ep_manage_own | ALL | public | (user_id = auth.uid()) |
| public.event_participants | ep_read | SELECT | public | is_verified_member() |
| public.event_recaps | event_recaps_delete | DELETE | public | (user_id = auth.uid()) |
| public.event_recaps | event_recaps_insert | INSERT | public |  | (user_id = auth.uid()) |
| public.event_recaps | event_recaps_read | SELECT | public | (EXISTS ( SELECT 1 FROM ((events e JOIN households h ON ((h.quarter_id = e.quarter_id))) JOIN household_members hm ON ((hm.household_id = h.id))) WHERE ((e.id = |
| public.events | events_quarter_delete | DELETE | public | (((user_id = auth.uid()) AND (quarter_id = get_user_quarter_id())) OR is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.events | events_quarter_insert | INSERT | public |  | ((quarter_id = get_user_quarter_id()) OR is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.events | events_quarter_select | SELECT | public | ((quarter_id = get_user_quarter_id()) OR is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.events | events_quarter_update | UPDATE | public | (((user_id = auth.uid()) AND (quarter_id = get_user_quarter_id())) OR is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.expert_endorsements | endorsements_create | INSERT | public |  | (is_verified_member() AND (endorser_user_id = auth.uid()) AND (expert_user_id <> auth.uid())) |
| public.expert_endorsements | endorsements_delete_own | DELETE | public | (endorser_user_id = auth.uid()) |
| public.expert_endorsements | endorsements_read | SELECT | public | is_verified_member() |
| public.expert_reviews | reviews_create | INSERT | public |  | (is_verified_member() AND (reviewer_user_id = auth.uid()) AND (expert_user_id <> auth.uid())) |
| public.expert_reviews | reviews_delete_own | DELETE | public | (reviewer_user_id = auth.uid()) |
| public.expert_reviews | reviews_read | SELECT | public | is_verified_member() |
| public.expert_reviews | reviews_update_own | UPDATE | public | (reviewer_user_id = auth.uid()) |
| public.external_doctors | external_doctors_delete_service | DELETE | service_role | true |
| public.external_doctors | external_doctors_insert_service | INSERT | service_role |  | true |
| public.external_doctors | external_doctors_select | SELECT | authenticated | (visible = true) |
| public.external_doctors | external_doctors_update_service | UPDATE | service_role | true |
| public.external_warning_cache | ewc_delete_admin | DELETE | authenticated | is_admin() |
| public.external_warning_cache | ewc_insert_admin | INSERT | authenticated |  | is_admin() |
| public.external_warning_cache | ewc_read | SELECT | authenticated | true |
| public.external_warning_cache | ewc_service | ALL | service_role | true | true |
| public.external_warning_cache | ewc_update_admin | UPDATE | authenticated | is_admin() |
| public.external_warning_sync_log | ewsl_admin | ALL | authenticated | is_admin() | is_admin() |
| public.external_warning_sync_log | ewsl_service | ALL | service_role | true | true |
| public.family_child_links | family_child_links_select_child | SELECT | public | (auth.uid() = child_user_id) |
| public.family_child_links | family_child_links_select_guardian | SELECT | public | (auth.uid() = guardian_user_id) |
| public.family_child_links | family_child_links_update_guardian_revoke | UPDATE | public | (auth.uid() = guardian_user_id) | (auth.uid() = guardian_user_id) |
| public.family_setup_audit | family_setup_audit_select_actor | SELECT | public | (auth.uid() = actor_user_id) |
| public.family_setup_audit | family_setup_audit_select_invitation_owner | SELECT | public | (EXISTS ( SELECT 1 FROM family_setup_invitations fsi WHERE ((fsi.id = family_setup_audit.invitation_id) AND ((fsi.created_by = auth.uid()) OR (fsi.guardian_user |
| public.family_setup_invitations | family_setup_invitations_select_creator | SELECT | public | (auth.uid() = created_by) |
| public.family_setup_invitations | family_setup_invitations_select_guardian | SELECT | public | (auth.uid() = guardian_user_id) |
| public.family_setup_invitations | family_setup_invitations_update_creator_revoke | UPDATE | public | (auth.uid() = created_by) | (auth.uid() = created_by) |
| public.feature_flags | feature_flags_delete | DELETE | authenticated | (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.is_admin = true)))) |
| public.feature_flags | feature_flags_insert | INSERT | authenticated |  | (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.is_admin = true)))) |
| public.feature_flags | feature_flags_select | SELECT | authenticated | true |
| public.feature_flags | feature_flags_update | UPDATE | authenticated | (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.is_admin = true)))) |
| public.feature_flags_audit_log | Admin reads feature flag audit log | SELECT | public | (((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.is_admin = true))))) |
| public.federal_state_rules | federal_state_rules_select | SELECT | authenticated | true |
| public.group_members | group_members_insert_self | INSERT | authenticated |  | ((user_id = auth.uid()) AND (((role = 'founder'::text) AND (status = 'active'::text) AND can_found_interest_group(group_id)) OR ((role = 'member'::text) AND ((( |
| public.group_members | group_members_select_scoped | SELECT | authenticated | ((user_id = auth.uid()) OR is_interest_group_member(group_id) OR is_interest_group_admin(group_id) OR is_interest_group_creator(group_id) OR can_join_interest_g |
| public.group_members | group_members_update_group_admin | UPDATE | authenticated | ((is_interest_group_founder(group_id) AND (role <> 'founder'::text)) OR (is_interest_group_admin(group_id) AND (role = 'member'::text))) | ((role = ANY (ARRAY['member'::text, 'admin'::text])) AND (status = ANY (ARRAY['active'::text, 'pending'::text, 'removed'::text])) AND (is_interest_group_founder |
| public.group_members | group_members_update_self | UPDATE | authenticated | ((user_id = auth.uid()) AND (role = ANY (ARRAY['member'::text, 'admin'::text]))) | ((user_id = auth.uid()) AND (((role = ANY (ARRAY['member'::text, 'admin'::text])) AND (status = 'removed'::text)) OR ((role = 'member'::text) AND (status = 'act |
| public.group_notification_settings | group_notification_settings_delete_own | DELETE | authenticated | (user_id = auth.uid()) |
| public.group_notification_settings | group_notification_settings_insert_own | INSERT | authenticated |  | ((user_id = auth.uid()) AND (is_interest_group_member(group_id) OR is_interest_group_creator(group_id) OR can_join_interest_group(group_id, ARRAY['open'::text, |
| public.group_notification_settings | group_notification_settings_select_own | SELECT | authenticated | (user_id = auth.uid()) |
| public.group_notification_settings | group_notification_settings_update_own | UPDATE | authenticated | (user_id = auth.uid()) | (user_id = auth.uid()) |
| public.group_post_comments | group_post_comments_delete_author | DELETE | authenticated | (user_id = auth.uid()) |
| public.group_post_comments | group_post_comments_insert_member | INSERT | authenticated |  | ((user_id = auth.uid()) AND can_comment_interest_group_post(post_id)) |
| public.group_post_comments | group_post_comments_select_visible | SELECT | authenticated | ((user_id = auth.uid()) OR can_read_interest_group_post(post_id)) |
| public.group_posts | group_posts_delete_author | DELETE | authenticated | (user_id = auth.uid()) |
| public.group_posts | group_posts_insert_member | INSERT | authenticated |  | ((user_id = auth.uid()) AND is_interest_group_member(group_id)) |
| public.group_posts | group_posts_select_visible | SELECT | authenticated | ((user_id = auth.uid()) OR is_interest_group_member(group_id) OR is_interest_group_creator(group_id) OR can_join_interest_group(group_id, ARRAY['open'::text, 'o |
| public.groups | groups_delete_founder | DELETE | authenticated | ((creator_id = auth.uid()) OR is_interest_group_founder(id)) |
| public.groups | groups_insert_creator | INSERT | authenticated |  | ((creator_id = auth.uid()) AND (member_count = 1) AND is_verified_in_quarter(quarter_id)) |
| public.groups | groups_select_quarter | SELECT | authenticated | is_verified_in_quarter(quarter_id) |
| public.groups | groups_update_admin | UPDATE | authenticated | ((creator_id = auth.uid()) OR is_interest_group_admin(id)) | (is_verified_in_quarter(quarter_id) AND ((creator_id = auth.uid()) OR is_interest_group_admin(id))) |
| public.heartbeats | heartbeats_insert_own | INSERT | public |  | (auth.uid() = user_id) |
| public.heartbeats | heartbeats_select_caregiver | SELECT | public | (EXISTS ( SELECT 1 FROM caregiver_links WHERE ((caregiver_links.caregiver_id = auth.uid()) AND (caregiver_links.resident_id = heartbeats.user_id) AND (caregiver |
| public.heartbeats | heartbeats_select_own | SELECT | public | (auth.uid() = user_id) |
| public.help_matches | matches_parties | ALL | authenticated | ((helper_id IN ( SELECT neighborhood_helpers.id FROM neighborhood_helpers WHERE (neighborhood_helpers.user_id = auth.uid()))) OR (request_id IN ( SELECT help_re |
| public.help_monthly_reports | reports_helper | ALL | authenticated | (helper_id IN ( SELECT neighborhood_helpers.id FROM neighborhood_helpers WHERE (neighborhood_helpers.user_id = auth.uid()))) |
| public.help_monthly_reports | reports_resident | ALL | authenticated | (resident_id = auth.uid()) |
| public.help_receipts | receipts_parties | ALL | authenticated | (session_id IN ( SELECT hs.id FROM ((help_sessions hs JOIN help_matches hm ON ((hs.match_id = hm.id))) JOIN neighborhood_helpers nh ON ((hm.helper_id = nh.id))) |
| public.help_requests | help_requests_quarter_delete | DELETE | public | (((user_id = auth.uid()) AND (quarter_id = get_user_quarter_id())) OR is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.help_requests | help_requests_quarter_insert | INSERT | public |  | ((quarter_id = get_user_quarter_id()) OR is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.help_requests | help_requests_quarter_select | SELECT | public | ((quarter_id = get_user_quarter_id()) OR is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.help_requests | help_requests_quarter_update | UPDATE | public | (((user_id = auth.uid()) AND (quarter_id = get_user_quarter_id())) OR is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.help_requests | requests_open_read | SELECT | public | ((status = 'open'::text) AND (quarter_id = get_user_quarter_id())) |
| public.help_requests | requests_own | ALL | authenticated | (auth.uid() = user_id) | (auth.uid() = user_id) |
| public.help_responses | help_responses_create | INSERT | public |  | ((auth.uid() = responder_user_id) AND (EXISTS ( SELECT 1 FROM household_members hm WHERE (hm.user_id = auth.uid())))) |
| public.help_responses | help_responses_delete_own | DELETE | public | (auth.uid() = responder_user_id) |
| public.help_responses | help_responses_read | SELECT | public | (EXISTS ( SELECT 1 FROM household_members hm WHERE (hm.user_id = auth.uid()))) |
| public.help_sessions | sessions_parties | ALL | authenticated | (match_id IN ( SELECT hm.id FROM (help_matches hm JOIN neighborhood_helpers nh ON ((hm.helper_id = nh.id))) WHERE (nh.user_id = auth.uid()) UNION SELECT hm.id F |
| public.helper_connections | connections_helper | ALL | authenticated | (helper_id IN ( SELECT neighborhood_helpers.id FROM neighborhood_helpers WHERE (neighborhood_helpers.user_id = auth.uid()))) |
| public.helper_connections | connections_resident | ALL | authenticated | (resident_id = auth.uid()) |
| public.household_members | hm_admin | ALL | public | is_admin() |
| public.household_members | hm_delete_own_or_admin | DELETE | public | ((user_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM users u WHERE ((u.id = auth.uid()) AND (u.is_admin = true))))) |
| public.household_members | hm_insert_restricted | INSERT | public |  | ((user_id = auth.uid()) AND ((EXISTS ( SELECT 1 FROM verification_requests vr WHERE ((vr.user_id = auth.uid()) AND (vr.household_id = household_members.househol |
| public.household_members | hm_read | SELECT | public | ((user_id = auth.uid()) OR is_verified_member()) |
| public.households | households_admin | ALL | public | is_admin() |
| public.households | households_quarter_select | SELECT | public | ((quarter_id = get_user_quarter_id()) OR is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.households | households_update | UPDATE | public | ((EXISTS ( SELECT 1 FROM household_members hm WHERE ((hm.household_id = households.id) AND (hm.user_id = auth.uid()) AND (hm.verified_at IS NOT NULL)))) OR (EXI |
| public.insurance_configs | insurance_configs_read | SELECT | public | true |
| public.kiosk_photos | kiosk_photos_delete | DELETE | public | (uploaded_by = auth.uid()) |
| public.kiosk_photos | kiosk_photos_insert | INSERT | public |  | ((uploaded_by = auth.uid()) AND (household_id IN ( SELECT h.id FROM ((households h JOIN household_members hm ON ((hm.household_id = h.id))) JOIN caregiver_links |
| public.kiosk_photos | kiosk_photos_select | SELECT | public | ((household_id IN ( SELECT h.id FROM ((households h JOIN household_members hm ON ((hm.household_id = h.id))) JOIN caregiver_links cl ON ((cl.resident_id = hm.us |
| public.kiosk_photos | kiosk_photos_select_household_member | SELECT | public | ((visible = true) AND (household_id IN ( SELECT hm.household_id FROM household_members hm WHERE ((hm.user_id = auth.uid()) AND (hm.verified_at IS NOT NULL))))) |
| public.kiosk_photos | kiosk_photos_update | UPDATE | public | (uploaded_by = auth.uid()) |
| public.kiosk_reminders | kiosk_reminders_delete | DELETE | public | (created_by = auth.uid()) |
| public.kiosk_reminders | kiosk_reminders_insert | INSERT | public |  | ((created_by = auth.uid()) AND (household_id IN ( SELECT h.id FROM ((households h JOIN household_members hm ON ((hm.household_id = h.id))) JOIN caregiver_links |
| public.kiosk_reminders | kiosk_reminders_select | SELECT | public | ((household_id IN ( SELECT h.id FROM ((households h JOIN household_members hm ON ((hm.household_id = h.id))) JOIN caregiver_links cl ON ((cl.resident_id = hm.us |
| public.kiosk_reminders | kiosk_reminders_select_household_member | SELECT | public | (household_id IN ( SELECT hm.household_id FROM household_members hm WHERE ((hm.user_id = auth.uid()) AND (hm.verified_at IS NOT NULL)))) |
| public.kiosk_reminders | kiosk_reminders_update | UPDATE | public | (created_by = auth.uid()) |
| public.kpi_targets | kpi_targets_manage_admin | ALL | public | is_admin() |
| public.kpi_targets | kpi_targets_read_admin | SELECT | public | is_admin() |
| public.kpi_targets | kpi_targets_read_quarter_admin | SELECT | public | is_quarter_admin_for(quarter_id) |
| public.leihboerse_items | leihboerse_create | INSERT | public |  | (is_verified_member() AND (user_id = auth.uid())) |
| public.leihboerse_items | leihboerse_delete | DELETE | public | (is_verified_member() AND (user_id = auth.uid())) |
| public.leihboerse_items | leihboerse_read | SELECT | public | is_verified_member() |
| public.leihboerse_items | leihboerse_update | UPDATE | public | (is_verified_member() AND (user_id = auth.uid())) |
| public.lost_found | lost_found_quarter_delete | DELETE | public | (is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.lost_found | lost_found_quarter_insert | INSERT | public |  | ((quarter_id = get_user_quarter_id()) OR is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.lost_found | lost_found_quarter_select | SELECT | public | ((quarter_id = get_user_quarter_id()) OR is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.lost_found | lost_found_quarter_update | UPDATE | public | (((user_id = auth.uid()) AND (quarter_id = get_user_quarter_id())) OR is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.map_houses | map_houses_admin_delete | DELETE | public | is_admin() |
| public.map_houses | map_houses_admin_insert | INSERT | public |  | is_admin() |
| public.map_houses | map_houses_admin_update | UPDATE | public | is_admin() |
| public.map_houses | map_houses_own_position | UPDATE | public | (is_verified_member() AND (EXISTS ( SELECT 1 FROM (household_members hm JOIN households h ON ((h.id = hm.household_id))) WHERE ((hm.user_id = auth.uid()) AND (h | (is_verified_member() AND (EXISTS ( SELECT 1 FROM (household_members hm JOIN households h ON ((h.id = hm.household_id))) WHERE ((hm.user_id = auth.uid()) AND (h |
| public.map_houses | map_houses_quarter_select | SELECT | public | (is_super_admin() OR (household_id IS NULL) OR is_household_in_my_quarter(household_id)) |
| public.map_houses | map_houses_user_upsert | ALL | public | (household_id IN ( SELECT household_members.household_id FROM household_members WHERE ((household_members.user_id = auth.uid()) AND (household_members.verified_ |
| public.marketplace_items | marketplace_items_quarter_delete | DELETE | public | (is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.marketplace_items | marketplace_items_quarter_insert | INSERT | public |  | ((quarter_id = get_user_quarter_id()) OR is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.marketplace_items | marketplace_items_quarter_select | SELECT | public | ((quarter_id = get_user_quarter_id()) OR is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.marketplace_items | marketplace_items_quarter_update | UPDATE | public | (((user_id = auth.uid()) AND (quarter_id = get_user_quarter_id())) OR is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.meal_signups | meal_signups_delete | DELETE | public | (auth.uid() = user_id) |
| public.meal_signups | meal_signups_insert | INSERT | public |  | ((auth.uid() = user_id) AND is_verified_member()) |
| public.meal_signups | meal_signups_select | SELECT | public | is_verified_member() |
| public.meal_signups | meal_signups_update | UPDATE | public | (auth.uid() = user_id) |
| public.moderation_actions | moderation_actions_admin_all | ALL | public | is_admin() |
| public.moderation_actions | moderation_actions_select_own | SELECT | public | (auth.uid() = user_id) |
| public.moderation_config | moderation_config_admin_all | ALL | public | is_admin() |
| public.moderation_queue | moderation_queue_admin_all | ALL | public | is_admin() |
| public.monthly_summaries | admin_all_summaries | ALL | public | true |
| public.municipal_announcements | announcements_delete | DELETE | public | ((EXISTS ( SELECT 1 FROM (org_members om JOIN organizations o ON (((o.id = om.org_id) AND (o.verification_status = 'verified'::org_verification_status)))) WHERE |
| public.municipal_announcements | announcements_insert | INSERT | public |  | ((author_id = auth.uid()) AND ((EXISTS ( SELECT 1 FROM (org_members om JOIN organizations o ON (((o.id = om.org_id) AND (o.verification_status = 'verified'::org |
| public.municipal_announcements | announcements_select | SELECT | public | ((quarter_id IN ( SELECT h.quarter_id FROM (household_members hm JOIN households h ON ((h.id = hm.household_id))) WHERE (hm.user_id = auth.uid()))) OR (EXISTS ( |
| public.municipal_announcements | announcements_update | UPDATE | public | ((EXISTS ( SELECT 1 FROM (org_members om JOIN organizations o ON (((o.id = om.org_id) AND (o.verification_status = 'verified'::org_verification_status)))) WHERE |
| public.municipal_config | municipal_config_insert | INSERT | public |  | ((EXISTS ( SELECT 1 FROM (org_members om JOIN organizations o ON (((o.id = om.org_id) AND (o.verification_status = 'verified'::org_verification_status)))) WHERE |
| public.municipal_config | municipal_config_select | SELECT | public | ((quarter_id IN ( SELECT h.quarter_id FROM (household_members hm JOIN households h ON ((h.id = hm.household_id))) WHERE (hm.user_id = auth.uid()))) OR (EXISTS ( |
| public.municipal_config | municipal_config_update | UPDATE | public | ((EXISTS ( SELECT 1 FROM (org_members om JOIN organizations o ON (((o.id = om.org_id) AND (o.verification_status = 'verified'::org_verification_status)))) WHERE |
| public.municipal_report_comments | report_comments_delete | DELETE | public | ((user_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.is_admin = true))))) |
| public.municipal_report_comments | report_comments_insert | INSERT | public |  | ((user_id = auth.uid()) AND (report_id IN ( SELECT municipal_reports.id FROM municipal_reports WHERE (municipal_reports.quarter_id IN ( SELECT h.quarter_id FROM |
| public.municipal_report_comments | report_comments_select | SELECT | public | ((report_id IN ( SELECT municipal_reports.id FROM municipal_reports WHERE (municipal_reports.quarter_id IN ( SELECT h.quarter_id FROM (household_members hm JOIN |
| public.municipal_reports | reports_delete | DELETE | public | ((user_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM (org_members om JOIN organizations o ON (((o.id = om.org_id) AND (o.verification_status = 'verified'::org_ver |
| public.municipal_reports | reports_insert | INSERT | public |  | ((user_id = auth.uid()) AND (quarter_id IN ( SELECT h.quarter_id FROM (household_members hm JOIN households h ON ((h.id = hm.household_id))) WHERE (hm.user_id = |
| public.municipal_reports | reports_select | SELECT | public | ((quarter_id IN ( SELECT h.quarter_id FROM (household_members hm JOIN households h ON ((h.id = hm.household_id))) WHERE (hm.user_id = auth.uid()))) OR (EXISTS ( |
| public.municipal_reports | reports_update_admin | UPDATE | public | ((EXISTS ( SELECT 1 FROM (org_members om JOIN organizations o ON (((o.id = om.org_id) AND (o.verification_status = 'verified'::org_verification_status)))) WHERE |
| public.neighbor_connections | nc_create | INSERT | public |  | (is_verified_member() AND (requester_id = auth.uid())) |
| public.neighbor_connections | nc_delete | DELETE | public | (is_verified_member() AND ((requester_id = auth.uid()) OR (target_id = auth.uid()))) |
| public.neighbor_connections | nc_read | SELECT | public | (is_verified_member() AND ((requester_id = auth.uid()) OR (target_id = auth.uid()))) |
| public.neighbor_connections | nc_update | UPDATE | public | (is_verified_member() AND (target_id = auth.uid())) |
| public.neighbor_invitations | neighbor_invitations_admin_read | SELECT | public | (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.is_admin = true)))) |
| public.neighbor_invitations | neighbor_invitations_own_read | SELECT | public | (auth.uid() = inviter_id) |
| public.neighbor_invitations | neighbor_invitations_update | UPDATE | public | ((inviter_id = auth.uid()) OR is_admin()) |
| public.neighbor_invitations | neighbor_invitations_verified_insert | INSERT | public |  | ((auth.uid() = inviter_id) AND (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.trust_level = ANY (ARRAY['verified'::text, 'trusted'::tex |
| public.neighbor_vouches | vouches_insert | INSERT | public |  | ((voucher_id = auth.uid()) AND (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.trust_level = ANY (ARRAY['verified'::text, 'trusted'::tex |
| public.neighbor_vouches | vouches_read | SELECT | public | ((voucher_id = auth.uid()) OR (target_id = auth.uid()) OR is_super_admin()) |
| public.neighborhood_helpers | helpers_own | ALL | authenticated | (auth.uid() = user_id) | (auth.uid() = user_id) |
| public.neighborhood_helpers | helpers_quarter_read | SELECT | authenticated | (verified = true) |
| public.news_items | news_items_quarter_delete | DELETE | public | (is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.news_items | news_items_quarter_insert | INSERT | public |  | (is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.news_items | news_items_quarter_select | SELECT | public | ((quarter_id IS NULL) OR (quarter_id = get_user_quarter_id()) OR is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.news_items | news_items_quarter_update | UPDATE | public | (is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.nina_warnings | nina_warnings_select | SELECT | authenticated | true |
| public.notifications | notif_insert_self_only | INSERT | public |  | (user_id = auth.uid()) |
| public.notifications | notif_own | SELECT | public | (user_id = auth.uid()) |
| public.notifications | notif_update_own | UPDATE | public | (user_id = auth.uid()) |
| public.onboarding_steps | admin_onboarding_steps | ALL | public | (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.role = 'super_admin'::text)))) |
| public.org_audit_log | org_audit_insert | INSERT | public |  | (org_id IN ( SELECT org_members.org_id FROM org_members WHERE ((org_members.user_id = auth.uid()) AND (org_members.role = 'admin'::org_member_role)))) |
| public.org_audit_log | org_audit_select | SELECT | public | ((org_id IN ( SELECT org_members.org_id FROM org_members WHERE ((org_members.user_id = auth.uid()) AND (org_members.role = 'admin'::org_member_role)))) OR (EXIS |
| public.org_members | org_members_own | SELECT | public | ((user_id = auth.uid()) OR (org_id IN ( SELECT org_members_1.org_id FROM org_members org_members_1 WHERE ((org_members_1.user_id = auth.uid()) AND (org_members_ |
| public.org_neighbors | neighbors_select | SELECT | public | ((org_a_id IN ( SELECT civic_members.org_id FROM civic_members WHERE (civic_members.user_id = auth.uid()))) OR (org_b_id IN ( SELECT civic_members.org_id FROM c |
| public.org_neighbors | neighbors_update | UPDATE | public | ((org_a_id IN ( SELECT civic_members.org_id FROM civic_members WHERE ((civic_members.user_id = auth.uid()) AND (civic_members.role = 'civic_admin'::text)))) OR |
| public.organizations | org_members_select | SELECT | public | ((id IN ( SELECT org_members.org_id FROM org_members WHERE (org_members.user_id = auth.uid()))) OR (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) |
| public.paketannahme | paketannahme_create | INSERT | public |  | (is_verified_member() AND (user_id = auth.uid())) |
| public.paketannahme | paketannahme_delete | DELETE | public | (is_verified_member() AND (user_id = auth.uid())) |
| public.paketannahme | paketannahme_read | SELECT | public | is_verified_member() |
| public.paketannahme | paketannahme_update | UPDATE | public | (is_verified_member() AND (user_id = auth.uid())) |
| public.passkey_credentials | passkey_delete_own | DELETE | public | (auth.uid() = user_id) |
| public.passkey_credentials | passkey_insert_own | INSERT | public |  | (auth.uid() = user_id) |
| public.passkey_credentials | passkey_select_own | SELECT | public | (auth.uid() = user_id) |
| public.passkey_credentials | passkey_update_own | UPDATE | public | (auth.uid() = user_id) | (auth.uid() = user_id) |
| public.pflege_resident_assignments | pra_insert_admin | INSERT | public |  | ((org_id IN ( SELECT om.org_id FROM org_members om WHERE ((om.user_id = auth.uid()) AND (om.role = 'admin'::org_member_role)))) AND (assigned_by = auth.uid())) |
| public.pflege_resident_assignments | pra_select_org_member | SELECT | public | (org_id IN ( SELECT om.org_id FROM org_members om WHERE (om.user_id = auth.uid()))) |
| public.pflege_resident_assignments | pra_update_admin | UPDATE | public | (org_id IN ( SELECT om.org_id FROM org_members om WHERE ((om.user_id = auth.uid()) AND (om.role = 'admin'::org_member_role)))) |
| public.plus_trial_grants | trial_grants_instructor | SELECT | public | (enrollment_id IN ( SELECT pe.id FROM (prevention_enrollments pe JOIN prevention_courses pc ON ((pc.id = pe.course_id))) WHERE (pc.instructor_id = auth.uid()))) |
| public.plus_trial_grants | trial_grants_own | SELECT | public | (caregiver_user_id = auth.uid()) |
| public.points_log | points_log_insert_service | INSERT | public |  | true |
| public.points_log | points_log_select_own | SELECT | public | (auth.uid() = user_id) |
| public.poll_options | poll_options_create | INSERT | public |  | (is_verified_member() AND (EXISTS ( SELECT 1 FROM polls WHERE ((polls.id = poll_options.poll_id) AND (polls.user_id = auth.uid()))))) |
| public.poll_options | poll_options_read | SELECT | public | is_verified_member() |
| public.poll_votes | poll_votes_create | INSERT | public |  | (is_verified_member() AND (user_id = auth.uid())) |
| public.poll_votes | poll_votes_delete | DELETE | public | (is_verified_member() AND (user_id = auth.uid())) |
| public.poll_votes | poll_votes_read | SELECT | public | is_verified_member() |
| public.polls | polls_create | INSERT | public |  | (is_verified_member() AND (user_id = auth.uid())) |
| public.polls | polls_delete | DELETE | public | (is_verified_member() AND (user_id = auth.uid())) |
| public.polls | polls_read | SELECT | public | is_verified_member() |
| public.polls | polls_update | UPDATE | public | (is_verified_member() AND (user_id = auth.uid())) |
| public.prevention_course_content | prevention_content_manage | ALL | public | (course_id IN ( SELECT prevention_courses.id FROM prevention_courses WHERE (prevention_courses.instructor_id = auth.uid()))) |
| public.prevention_course_content | prevention_content_read | SELECT | public | (course_id IN ( SELECT prevention_courses.id FROM prevention_courses WHERE (prevention_courses.instructor_id = auth.uid()) UNION SELECT prevention_enrollments.c |
| public.prevention_courses | prevention_courses_manage | ALL | public | (instructor_id = auth.uid()) |
| public.prevention_courses | prevention_courses_read | SELECT | public | true |
| public.prevention_enrollments | prevention_enrollments_insert_own | INSERT | public |  | (user_id = auth.uid()) |
| public.prevention_enrollments | prevention_enrollments_instructor | SELECT | public | (course_id IN ( SELECT prevention_courses.id FROM prevention_courses WHERE (prevention_courses.instructor_id = auth.uid()))) |
| public.prevention_enrollments | prevention_enrollments_select_own | SELECT | public | (user_id = auth.uid()) |
| public.prevention_enrollments | prevention_enrollments_update_own | UPDATE | public | (user_id = auth.uid()) |
| public.prevention_group_calls | prevention_calls_read | SELECT | public | (course_id IN ( SELECT prevention_courses.id FROM prevention_courses WHERE (prevention_courses.instructor_id = auth.uid()) UNION SELECT prevention_enrollments.c |
| public.prevention_messages | prevention_messages_insert | INSERT | public |  | ((sender_id = auth.uid()) AND (sender_id IN ( SELECT prevention_courses.instructor_id FROM prevention_courses WHERE (prevention_courses.id = prevention_messages |
| public.prevention_messages | prevention_messages_read | SELECT | public | ((recipient_id = auth.uid()) OR ((recipient_id IS NULL) AND (course_id IN ( SELECT prevention_enrollments.course_id FROM prevention_enrollments WHERE (preventio |
| public.prevention_payments | prevention_payments_own | ALL | public | (enrollment_id IN ( SELECT prevention_enrollments.id FROM prevention_enrollments WHERE (prevention_enrollments.user_id = auth.uid()))) |
| public.prevention_reviews | reviews_own | ALL | public | (user_id = auth.uid()) |
| public.prevention_reviews | reviews_public | SELECT | public | true |
| public.prevention_sessions | prevention_sessions_instructor | SELECT | public | (enrollment_id IN ( SELECT pe.id FROM (prevention_enrollments pe JOIN prevention_courses pc ON ((pc.id = pe.course_id))) WHERE (pc.instructor_id = auth.uid()))) |
| public.prevention_sessions | prevention_sessions_own | ALL | public | (enrollment_id IN ( SELECT prevention_enrollments.id FROM prevention_enrollments WHERE (prevention_enrollments.user_id = auth.uid()))) |
| public.prevention_visibility_consent | prevention_consent_own | ALL | public | (user_id = auth.uid()) |
| public.push_subscriptions | push_own | ALL | public | (user_id = auth.uid()) |
| public.quarter_admins | quarter_admins_read_own | SELECT | public | (user_id = auth.uid()) |
| public.quarter_admins | quarter_admins_super_admin | ALL | public | is_super_admin() |
| public.quarter_lotsen | lotsen_manage | ALL | public | (is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.quarter_lotsen | lotsen_read | SELECT | public | ((user_id = auth.uid()) OR is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.quarters | quarters_admin_manage | ALL | public | (is_super_admin() OR is_quarter_admin_for(id)) |
| public.quarters | quarters_select_active | SELECT | public | ((auth.uid() IS NOT NULL) AND ((status = 'active'::text) OR is_super_admin() OR is_quarter_admin_for(id))) |
| public.quartier_info_cache | quartier_info_cache_select | SELECT | authenticated | true |
| public.recall_reminders | recall_doctor_own | ALL | public | (doctor_id = auth.uid()) |
| public.reputation_points | reputation_points_admin_read | SELECT | public | (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.is_admin = true)))) |
| public.reputation_points | reputation_points_own_read | SELECT | public | (auth.uid() = user_id) |
| public.retention_policies | service_role_only | ALL | public | (auth.role() = 'service_role'::text) |
| public.security_events | sec_events_admin_read | SELECT | public | (auth.uid() IN ( SELECT org_members.user_id FROM org_members WHERE (org_members.role = 'admin'::org_member_role))) |
| public.security_events | sec_events_admin_resolve | UPDATE | public | (auth.uid() IN ( SELECT org_members.user_id FROM org_members WHERE (org_members.role = 'admin'::org_member_role))) | (resolved IS NOT NULL) |
| public.senior_checkins | checkin_own | ALL | public | (user_id = auth.uid()) |
| public.shared_meals | shared_meals_delete | DELETE | public | (auth.uid() = user_id) |
| public.shared_meals | shared_meals_insert | INSERT | public |  | ((auth.uid() = user_id) AND is_verified_member()) |
| public.shared_meals | shared_meals_select | SELECT | public | is_verified_member() |
| public.shared_meals | shared_meals_update | UPDATE | public | (auth.uid() = user_id) |
| public.skills | skills_quarter_delete | DELETE | public | ((user_id = auth.uid()) OR is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.skills | skills_quarter_insert | INSERT | public |  | ((user_id = auth.uid()) AND ((quarter_id = get_user_quarter_id()) OR is_super_admin())) |
| public.skills | skills_quarter_select | SELECT | public | ((user_id = auth.uid()) OR ((is_public = true) AND ((quarter_id = get_user_quarter_id()) OR is_super_admin() OR is_quarter_admin_for(quarter_id)))) |
| public.skills | skills_quarter_update | UPDATE | public | ((user_id = auth.uid()) OR is_super_admin() OR is_quarter_admin_for(quarter_id)) |
| public.speed_dial_favorites | speed_dial_delete_caregiver | DELETE | public | (EXISTS ( SELECT 1 FROM caregiver_links WHERE ((caregiver_links.resident_id = speed_dial_favorites.user_id) AND (caregiver_links.caregiver_id = auth.uid()) AND |
| public.speed_dial_favorites | speed_dial_delete_own | DELETE | public | (user_id = auth.uid()) |
| public.speed_dial_favorites | speed_dial_insert_caregiver | INSERT | public |  | ((EXISTS ( SELECT 1 FROM caregiver_links WHERE ((caregiver_links.resident_id = speed_dial_favorites.user_id) AND (caregiver_links.caregiver_id = auth.uid()) AND |
| public.speed_dial_favorites | speed_dial_insert_own | INSERT | public |  | ((user_id = auth.uid()) AND (created_by = auth.uid())) |
| public.speed_dial_favorites | speed_dial_select_caregiver | SELECT | public | (EXISTS ( SELECT 1 FROM caregiver_links WHERE ((caregiver_links.resident_id = speed_dial_favorites.user_id) AND (caregiver_links.caregiver_id = auth.uid()) AND |
| public.speed_dial_favorites | speed_dial_select_own | SELECT | public | (user_id = auth.uid()) |
| public.speed_dial_favorites | speed_dial_update_caregiver | UPDATE | public | (EXISTS ( SELECT 1 FROM caregiver_links WHERE ((caregiver_links.resident_id = speed_dial_favorites.user_id) AND (caregiver_links.caregiver_id = auth.uid()) AND |
| public.speed_dial_favorites | speed_dial_update_own | UPDATE | public | (user_id = auth.uid()) |
| public.test_results | admin_select_all_results | SELECT | public | (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.is_admin = true)))) |
| public.test_results | tester_insert_own_results | INSERT | public |  | (EXISTS ( SELECT 1 FROM test_sessions WHERE ((test_sessions.id = test_results.session_id) AND (test_sessions.user_id = auth.uid())))) |
| public.test_results | tester_select_own_results | SELECT | public | (EXISTS ( SELECT 1 FROM test_sessions WHERE ((test_sessions.id = test_results.session_id) AND (test_sessions.user_id = auth.uid())))) |
| public.test_results | tester_update_own_results | UPDATE | public | (EXISTS ( SELECT 1 FROM test_sessions WHERE ((test_sessions.id = test_results.session_id) AND (test_sessions.user_id = auth.uid())))) |
| public.test_sessions | admin_select_all_sessions | SELECT | public | (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.is_admin = true)))) |
| public.test_sessions | tester_insert_own_sessions | INSERT | public |  | (auth.uid() = user_id) |
| public.test_sessions | tester_select_own_sessions | SELECT | public | (auth.uid() = user_id) |
| public.test_sessions | tester_update_own_sessions | UPDATE | public | (auth.uid() = user_id) |
| public.tip_confirmations | confirmations_delete | DELETE | authenticated | (auth.uid() = user_id) |
| public.tip_confirmations | confirmations_insert | INSERT | authenticated |  | ((auth.uid() = user_id) AND (EXISTS ( SELECT 1 FROM household_members hm WHERE ((hm.user_id = auth.uid()) AND (hm.verified_at IS NOT NULL))))) |
| public.tip_confirmations | confirmations_select | SELECT | authenticated | (EXISTS ( SELECT 1 FROM household_members hm WHERE ((hm.user_id = auth.uid()) AND (hm.verified_at IS NOT NULL)))) |
| public.tip_reviews | tip_reviews_delete | DELETE | public | (user_id = auth.uid()) |
| public.tip_reviews | tip_reviews_insert | INSERT | public |  | ((user_id = auth.uid()) AND (EXISTS ( SELECT 1 FROM auth.users u WHERE ((u.id = auth.uid()) AND (u.created_at < (now() - '7 days'::interval)))))) |
| public.tip_reviews | tip_reviews_read | SELECT | public | true |
| public.user_badges | user_badges_insert_service | INSERT | public |  | true |
| public.user_badges | user_badges_select_all | SELECT | public | true |
| public.user_blocks | user_blocks_manage_own | ALL | public | (auth.uid() = blocker_id) |
| public.user_blocks | user_blocks_see_blocked | SELECT | public | (auth.uid() = blocked_id) |
| public.user_memory_audit_log | caregiver_audit | SELECT | public | (EXISTS ( SELECT 1 FROM caregiver_links WHERE ((caregiver_links.resident_id = user_memory_audit_log.target_user_id) AND (caregiver_links.caregiver_id = auth.uid |
| public.user_memory_audit_log | insert_audit | INSERT | public |  | (auth.uid() = actor_user_id) |
| public.user_memory_audit_log | user_own_audit | SELECT | public | (auth.uid() = target_user_id) |
| public.user_memory_consents | caregiver_consents_select | SELECT | public | (EXISTS ( SELECT 1 FROM caregiver_links WHERE ((caregiver_links.resident_id = user_memory_consents.user_id) AND (caregiver_links.caregiver_id = auth.uid()) AND |
| public.user_memory_consents | user_own_consents | ALL | public | (auth.uid() = user_id) |
| public.user_memory_facts | care_team_facts_select | SELECT | public | ((visibility = 'care_team'::memory_visibility) AND (EXISTS ( SELECT 1 FROM org_members WHERE ((org_members.org_id = user_memory_facts.org_id) AND (org_members.u |
| public.user_memory_facts | caregiver_facts_insert | INSERT | public |  | (EXISTS ( SELECT 1 FROM caregiver_links WHERE ((caregiver_links.resident_id = user_memory_facts.user_id) AND (caregiver_links.caregiver_id = auth.uid()) AND (ca |
| public.user_memory_facts | caregiver_facts_select | SELECT | public | (EXISTS ( SELECT 1 FROM caregiver_links WHERE ((caregiver_links.resident_id = user_memory_facts.user_id) AND (caregiver_links.caregiver_id = auth.uid()) AND (ca |
| public.user_memory_facts | caregiver_facts_update | UPDATE | public | (EXISTS ( SELECT 1 FROM caregiver_links WHERE ((caregiver_links.resident_id = user_memory_facts.user_id) AND (caregiver_links.caregiver_id = auth.uid()) AND (ca |
| public.user_memory_facts | user_own_facts_delete | DELETE | public | (auth.uid() = user_id) |
| public.user_memory_facts | user_own_facts_insert | INSERT | public |  | ((auth.uid() = user_id) OR (auth.uid() = source_user_id)) |
| public.user_memory_facts | user_own_facts_select | SELECT | public | (auth.uid() = user_id) |
| public.user_memory_facts | user_own_facts_update | UPDATE | public | (auth.uid() = user_id) |
| public.users | users_insert | INSERT | public |  | (id = auth.uid()) |
| public.users | users_quarter_select | SELECT | public | ((id = auth.uid()) OR is_super_admin() OR is_same_quarter_user(id)) |
| public.users | users_read_own | SELECT | public | (id = auth.uid()) |
| public.users | users_update_own | UPDATE | public | (id = auth.uid()) |
| public.vacation_modes | vacation_create | INSERT | public |  | (is_verified_member() AND (user_id = auth.uid())) |
| public.vacation_modes | vacation_delete | DELETE | public | (user_id = auth.uid()) |
| public.vacation_modes | vacation_read | SELECT | public | is_verified_member() |
| public.vacation_modes | vacation_update | UPDATE | public | (user_id = auth.uid()) |
| public.verification_requests | verification_requests_admin_read | SELECT | public | (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.is_admin = true)))) |
| public.verification_requests | verification_requests_admin_update | UPDATE | public | (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.is_admin = true)))) |
| public.verification_requests | verification_requests_own_insert | INSERT | public |  | (auth.uid() = user_id) |
| public.verification_requests | verification_requests_own_read | SELECT | public | (auth.uid() = user_id) |
| public.video_calls | video_calls_insert_caller_v2 | INSERT | public |  | ((auth.uid() = caller_id) AND (((type = 'pro_medical'::text) AND (EXISTS ( SELECT 1 FROM doctor_profiles WHERE ((doctor_profiles.user_id = auth.uid()) AND (doct |
| public.video_calls | video_calls_select_own | SELECT | public | ((auth.uid() = caller_id) OR (auth.uid() = callee_id)) |
| public.video_calls | video_calls_update_participants | UPDATE | public | ((auth.uid() = caller_id) OR (auth.uid() = callee_id)) | ((auth.uid() = caller_id) OR (auth.uid() = callee_id)) |
| public.video_credits | video_credits_owner_select | SELECT | public | (auth.uid() = doctor_id) |
| public.warning_cache | warning_cache_select | SELECT | public | ((quarter_id IS NULL) OR (quarter_id = ( SELECT get_user_quarter_id() AS get_user_quarter_id)) OR (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) A |
| public.warning_cache | warning_cache_service_delete | DELETE | public | true |
| public.warning_cache | warning_cache_service_insert | INSERT | public |  | true |
| public.waste_collection_areas | wca_admin | ALL | authenticated | (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))) |
| public.waste_collection_areas | wca_read | SELECT | authenticated | true |
| public.waste_collection_areas | wca_service | ALL | service_role | true | true |
| public.waste_collection_dates | wcd_admin | ALL | authenticated | (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))) |
| public.waste_collection_dates | wcd_read | SELECT | authenticated | true |
| public.waste_collection_dates | wcd_service | ALL | service_role | true | true |
| public.waste_reminders | waste_reminders_own | ALL | public | (user_id = auth.uid()) |
| public.waste_schedules | waste_schedules_delete | DELETE | public | ((EXISTS ( SELECT 1 FROM (org_members om JOIN organizations o ON (((o.id = om.org_id) AND (o.verification_status = 'verified'::org_verification_status)))) WHERE |
| public.waste_schedules | waste_schedules_insert | INSERT | public |  | ((EXISTS ( SELECT 1 FROM (org_members om JOIN organizations o ON (((o.id = om.org_id) AND (o.verification_status = 'verified'::org_verification_status)))) WHERE |
| public.waste_schedules | waste_schedules_select | SELECT | public | ((quarter_id IN ( SELECT h.quarter_id FROM (household_members hm JOIN households h ON ((h.id = hm.household_id))) WHERE (hm.user_id = auth.uid()))) OR (EXISTS ( |
| public.waste_schedules | waste_schedules_update | UPDATE | public | ((EXISTS ( SELECT 1 FROM (org_members om JOIN organizations o ON (((o.id = om.org_id) AND (o.verification_status = 'verified'::org_verification_status)))) WHERE |
| public.waste_source_registry | wsr_admin | ALL | authenticated | (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))) |
| public.waste_source_registry | wsr_read | SELECT | authenticated | true |
| public.waste_source_registry | wsr_service | ALL | service_role | true | true |
| public.waste_sync_log | wsl_admin | ALL | authenticated | (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))) |
| public.waste_sync_log | wsl_service | ALL | service_role | true | true |
| public.youth_badges | youth_badges_delete_service_only | DELETE | service_role | true |
| public.youth_badges | youth_badges_insert_service_only | INSERT | service_role |  | true |
| public.youth_badges | youth_badges_select_authenticated | SELECT | authenticated | true |
| public.youth_earned_badges | youth_earned_badges_insert_service | INSERT | public |  | true |
| public.youth_earned_badges | youth_earned_badges_select_own | SELECT | public | (auth.uid() = user_id) |
| public.youth_guardian_consents | youth_consents_insert_own | INSERT | public |  | (auth.uid() = youth_user_id) |
| public.youth_guardian_consents | youth_consents_select_own | SELECT | public | (auth.uid() = youth_user_id) |
| public.youth_moderation_log | youth_moderation_select_org | SELECT | public | ((moderator_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM org_members om WHERE ((om.user_id = auth.uid()) AND (om.role = 'admin'::org_member_role))))) |
| public.youth_points_ledger | youth_points_select_own | SELECT | public | (auth.uid() = user_id) |
| public.youth_profiles | youth_profiles_insert_service | INSERT | public |  | true |
| public.youth_profiles | youth_profiles_select_org | SELECT | public | (EXISTS ( SELECT 1 FROM org_members om WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::org_member_role, 'viewer'::org_member_role])) AND (yo |
| public.youth_profiles | youth_profiles_select_own | SELECT | public | (auth.uid() = user_id) |
| public.youth_profiles | youth_profiles_update_own | UPDATE | public | (auth.uid() = user_id) | (auth.uid() = user_id) |
| public.youth_tasks | youth_tasks_insert_resident | INSERT | public |  | (auth.uid() = created_by) |
| public.youth_tasks | youth_tasks_select_quarter | SELECT | public | ((status = 'open'::text) OR (created_by = auth.uid()) OR (accepted_by = auth.uid()) OR (EXISTS ( SELECT 1 FROM org_members om WHERE ((om.user_id = auth.uid()) A |
| public.youth_tasks | youth_tasks_update_involved | UPDATE | public | ((created_by = auth.uid()) OR (accepted_by = auth.uid()) OR (EXISTS ( SELECT 1 FROM org_members om WHERE ((om.user_id = auth.uid()) AND (om.role = 'admin'::org_ |
| storage.objects | avatar_delete_own | DELETE | public | ((bucket_id = 'images'::text) AND (name ~~ (('avatars/'::text \|\| (auth.uid())::text) \|\| '%'::text))) |
| storage.objects | avatar_update_own | UPDATE | public | ((bucket_id = 'images'::text) AND (name ~~ (('avatars/'::text \|\| (auth.uid())::text) \|\| '%'::text))) |
| storage.objects | avatar_upload_own | INSERT | public |  | ((bucket_id = 'images'::text) AND ((storage.foldername(name))[1] = 'avatars'::text) AND (auth.uid() IS NOT NULL) AND (name ~~ (('avatars/'::text \|\| (auth.uid()) |
| storage.objects | category_images_delete | DELETE | public | ((bucket_id = 'images'::text) AND ((storage.foldername(name))[1] = ANY (ARRAY['marketplace'::text, 'lost-found'::text, 'leihboerse'::text])) AND (auth.uid() IS |
| storage.objects | category_images_upload | INSERT | public |  | ((bucket_id = 'images'::text) AND (auth.uid() IS NOT NULL) AND ((storage.foldername(name))[1] = ANY (ARRAY['marketplace'::text, 'lost-found'::text, 'leihboerse' |
| storage.objects | chat_media_delete | DELETE | public | ((bucket_id = 'chat-media'::text) AND (owner = auth.uid())) |
| storage.objects | chat_media_insert | INSERT | public |  | ((bucket_id = 'chat-media'::text) AND (auth.uid() IS NOT NULL) AND ((((storage.foldername(name))[1] = 'direct'::text) AND (EXISTS ( SELECT 1 FROM conversations |
| storage.objects | chat_media_select | SELECT | public | ((bucket_id = 'chat-media'::text) AND ((((storage.foldername(name))[1] = 'direct'::text) AND (EXISTS ( SELECT 1 FROM conversations c WHERE (((c.id)::text = (sto |
| storage.objects | citizen_read_attachments | SELECT | public | ((bucket_id = 'civic-attachments'::text) AND (EXISTS ( SELECT 1 FROM (civic_message_attachments cma JOIN civic_messages cm ON ((cm.id = cma.message_id))) WHERE |
| storage.objects | images_read_all | SELECT | public | (bucket_id = 'images'::text) |
| storage.objects | report_photos_delete | DELETE | public | ((bucket_id = 'report-photos'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) A |
| storage.objects | report_photos_insert | INSERT | public |  | ((bucket_id = 'report-photos'::text) AND (auth.role() = 'authenticated'::text)) |
| storage.objects | report_photos_select | SELECT | public | (bucket_id = 'report-photos'::text) |
| storage.objects | service_upload_civic_attachments | INSERT | public |  | ((bucket_id = 'civic-attachments'::text) AND (auth.role() = 'service_role'::text)) |
| storage.objects | staff_read_attachments | SELECT | public | ((bucket_id = 'civic-attachments'::text) AND (EXISTS ( SELECT 1 FROM ((civic_message_attachments cma JOIN civic_messages cm ON ((cm.id = cma.message_id))) JOIN |
| storage.objects | test_screenshots_delete | DELETE | public | ((bucket_id = 'images'::text) AND ((storage.foldername(name))[1] = 'test-screenshots'::text) AND (auth.uid() IS NOT NULL)) |
| storage.objects | test_screenshots_upload | INSERT | public |  | ((bucket_id = 'images'::text) AND ((storage.foldername(name))[1] = 'test-screenshots'::text) AND (auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1 FROM users WHER |
| storage.objects | tts-cache public read | SELECT | public | (bucket_id = 'tts-cache'::text) |
| storage.objects | tts-cache service update | UPDATE | public | ((bucket_id = 'tts-cache'::text) AND (auth.role() = 'service_role'::text)) |
| storage.objects | tts-cache service write | INSERT | public |  | ((bucket_id = 'tts-cache'::text) AND (auth.role() = 'service_role'::text)) |


## Trigger (public)

| Tabelle | Trigger | Events | Timing |
|---|---|---|---|
| public.alerts | trigger_clear_alert_location | UPDATE | BEFORE |
| public.care_appointments | care_appointments_updated_at | UPDATE | BEFORE |
| public.care_audit_log | no_audit_delete | DELETE | BEFORE |
| public.care_audit_log | no_audit_update | UPDATE | BEFORE |
| public.care_helpers | care_helpers_updated_at | UPDATE | BEFORE |
| public.care_medications | care_medications_updated_at | UPDATE | BEFORE |
| public.care_profiles | care_profiles_updated_at | UPDATE | BEFORE |
| public.care_shopping_requests | care_shopping_requests_updated_at | UPDATE | BEFORE |
| public.care_subscriptions | care_subscriptions_updated_at | UPDATE | BEFORE |
| public.care_tasks | care_tasks_updated_at | UPDATE | BEFORE |
| public.caregiver_links | enforce_caregiver_links_update_restrictions_trigger | UPDATE | BEFORE |
| public.caregiver_links | protect_auto_answer_senior_consent_trigger | UPDATE | BEFORE |
| public.caregiver_links | protect_plus_trial_end_trigger | UPDATE | BEFORE |
| public.chat_group_members | trg_chat_group_members_limit | INSERT | BEFORE |
| public.chat_groups | on_chat_group_created | INSERT | AFTER |
| public.external_warning_cache | external_warning_cache_updated_at | UPDATE | BEFORE |
| public.feature_flags | feature_flags_audit_log_trigger | DELETE,INSERT,UPDATE | AFTER |
| public.feature_flags | feature_flags_updated_at | UPDATE | BEFORE |
| public.group_members | trg_group_members_identity_immutable | UPDATE | BEFORE |
| public.group_members | trg_group_members_refresh_member_count | UPDATE,INSERT,DELETE | AFTER |
| public.groups | trg_groups_identity_immutable | UPDATE | BEFORE |
| public.household_members | trg_quarter_lifecycle | INSERT,UPDATE | AFTER |
| public.household_members | trigger_enforce_member_defaults | INSERT | BEFORE |
| public.households | households_trim_street_name_trigger | INSERT,UPDATE | BEFORE |
| public.households | trg_sync_household_quarter_id | INSERT,UPDATE | BEFORE |
| public.map_houses | map_houses_updated_at | UPDATE | BEFORE |
| public.map_houses | trg_sync_map_house_geo | UPDATE,INSERT | BEFORE |
| public.map_houses | trg_validate_house_in_boundary | INSERT,UPDATE | BEFORE |
| public.org_audit_log | trg_audit_hash_chain | INSERT | BEFORE |
| public.speed_dial_favorites | trg_speed_dial_updated_at | UPDATE | BEFORE |
| public.tip_confirmations | trigger_tip_confirmation_count | DELETE,INSERT | AFTER |
| public.user_memory_facts | trigger_memory_facts_updated_at | UPDATE | BEFORE |
| public.users | trg_users_update_restrictions | UPDATE | BEFORE |
| public.users | trigger_enforce_user_defaults | INSERT | BEFORE |
| public.youth_profiles | trg_youth_profiles_update_restrictions | UPDATE | BEFORE |
| public.youth_profiles | youth_profiles_updated_at | UPDATE | BEFORE |


## Tabellen-Grants (anon / authenticated / service_role)

| Tabelle | Rolle | Privilegien |
|---|---|---|
| public.access_codes | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.access_codes | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.access_codes | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.admin_access_logs | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.admin_access_logs | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.admin_access_logs | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.admin_audit_log | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.admin_audit_log | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.admin_audit_log | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.admin_expenses | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.admin_expenses | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.admin_expenses | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.alert_responses | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.alert_responses | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.alert_responses | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.alerts | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.alerts | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.alerts | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.amtsblatt_issues | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.amtsblatt_issues | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.amtsblatt_issues | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.analytics_snapshots | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.analytics_snapshots | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.analytics_snapshots | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.anamnesis_forms | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.anamnesis_forms | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.anamnesis_forms | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.anamnesis_templates | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.anamnesis_templates | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.anamnesis_templates | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.appointments | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.appointments | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.appointments | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.audit_log | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.audit_log | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.audit_log | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.board_comments | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.board_comments | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.board_comments | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.bug_report_rate_limits | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.bug_report_rate_limits | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.bug_report_rate_limits | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.bug_reports | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.bug_reports | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.bug_reports | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.business_transactions | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.business_transactions | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.business_transactions | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_appointments | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_appointments | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_appointments | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_audit_log | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_audit_log | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_audit_log | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_checkins | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_checkins | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_checkins | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_consent_history | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_consent_history | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_consent_history | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_consents | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_consents | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_consents | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_documents | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_documents | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_documents | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_helpers | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_helpers | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_helpers | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_medication_logs | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_medication_logs | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_medication_logs | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_medications | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_medications | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_medications | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_profiles | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_profiles | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_profiles | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_profiles_hilfe | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_profiles_hilfe | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_profiles_hilfe | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_shopping_requests | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_shopping_requests | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_shopping_requests | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_sos_alerts | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_sos_alerts | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_sos_alerts | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_sos_responses | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_sos_responses | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_sos_responses | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_subscriptions | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_subscriptions | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_subscriptions | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_tasks | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_tasks | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.care_tasks | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.caregiver_invites | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.caregiver_invites | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.caregiver_invites | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.caregiver_links | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.caregiver_links | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.caregiver_links | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.chat_group_members | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.chat_group_members | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.chat_group_members | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.chat_group_messages | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.chat_group_messages | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.chat_group_messages | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.chat_groups | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.chat_groups | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.chat_groups | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.circle_events | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.circle_events | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.circle_events | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.citizen_reports | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.citizen_reports | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.citizen_reports | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_announcements | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_announcements | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_announcements | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_appointments | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_appointments | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_appointments | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_audit_log | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_audit_log | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_audit_log | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_document_requests | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_document_requests | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_document_requests | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_events | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_events | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_events | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_members | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_members | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_members | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_message_attachments | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_message_attachments | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_message_attachments | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_messages | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_messages | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_messages | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_organizations | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_organizations | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_organizations | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_survey_options | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_survey_options | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_survey_options | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_survey_votes | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_survey_votes | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_survey_votes | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_surveys | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_surveys | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.civic_surveys | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.claude_messages | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.claude_messages | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.claude_messages | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.community_rules_violations | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.community_rules_violations | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.community_rules_violations | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.community_tips | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.community_tips | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.community_tips | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.consent_grants | anon | INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.consent_grants | authenticated | INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.consent_grants | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.consent_versions | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.consent_versions | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.consent_versions | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.construction_sites | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.construction_sites | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.construction_sites | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.consultation_consents | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.consultation_consents | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.consultation_consents | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.consultation_slots | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.consultation_slots | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.consultation_slots | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.contact_links | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.contact_links | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.contact_links | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.content_reports | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.content_reports | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.content_reports | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.conversations | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.conversations | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.conversations | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.craftsman_recommendations | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.craftsman_recommendations | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.craftsman_recommendations | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.craftsman_usage_events | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.craftsman_usage_events | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.craftsman_usage_events | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.crisis_alerts | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.crisis_alerts | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.crisis_alerts | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.crisis_templates | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.crisis_templates | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.crisis_templates | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.cron_heartbeats | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.cron_heartbeats | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.cron_heartbeats | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.cron_job_runs | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.cron_job_runs | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.cron_job_runs | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.cross_org_deliveries | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.cross_org_deliveries | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.cross_org_deliveries | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.cross_org_requests | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.cross_org_requests | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.cross_org_requests | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.data_breach_incidents | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.data_breach_incidents | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.data_breach_incidents | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.data_requests | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.data_requests | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.data_requests | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.data_retention_log | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.data_retention_log | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.data_retention_log | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.device_heartbeats | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.device_heartbeats | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.device_heartbeats | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.device_refresh_tokens | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.device_refresh_tokens | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.device_refresh_tokens | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.device_tokens | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.device_tokens | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.device_tokens | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.direct_messages | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.direct_messages | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.direct_messages | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.doctor_consents | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.doctor_consents | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.doctor_consents | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.doctor_profiles | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.doctor_profiles | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.doctor_profiles | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.doctor_reviews | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.doctor_reviews | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.doctor_reviews | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.escalation_events | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.escalation_events | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.escalation_events | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.event_participants | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.event_participants | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.event_participants | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.event_recaps | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.event_recaps | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.event_recaps | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.events | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.events | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.events | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.expert_endorsements | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.expert_endorsements | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.expert_endorsements | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.expert_reviews | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.expert_reviews | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.expert_reviews | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.external_doctors | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.external_doctors | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.external_doctors | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.external_warning_cache | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.external_warning_cache | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.external_warning_cache | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.external_warning_sync_log | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.external_warning_sync_log | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.external_warning_sync_log | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.family_child_links | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.family_child_links | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.family_child_links | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.family_setup_audit | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.family_setup_audit | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.family_setup_audit | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.family_setup_invitations | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.family_setup_invitations | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.family_setup_invitations | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.feature_flags | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.feature_flags | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.feature_flags | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.feature_flags_audit_log | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.feature_flags_audit_log | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.feature_flags_audit_log | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.federal_state_rules | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.federal_state_rules | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.federal_state_rules | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.geography_columns | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.geography_columns | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.geography_columns | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.geometry_columns | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.geometry_columns | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.geometry_columns | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.group_members | authenticated | INSERT,SELECT,UPDATE |
| public.group_members | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.group_notification_settings | authenticated | DELETE,INSERT,SELECT,UPDATE |
| public.group_notification_settings | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.group_post_comments | authenticated | DELETE,INSERT,SELECT |
| public.group_post_comments | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.group_posts | authenticated | DELETE,INSERT,SELECT |
| public.group_posts | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.groups | authenticated | DELETE,INSERT,SELECT |
| public.groups | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.heartbeats | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.heartbeats | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.heartbeats | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.help_matches | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.help_matches | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.help_matches | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.help_monthly_reports | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.help_monthly_reports | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.help_monthly_reports | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.help_receipts | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.help_receipts | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.help_receipts | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.help_requests | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.help_requests | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.help_requests | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.help_responses | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.help_responses | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.help_responses | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.help_sessions | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.help_sessions | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.help_sessions | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.helper_connections | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.helper_connections | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.helper_connections | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.household_members | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.household_members | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.household_members | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.households | anon | DELETE,INSERT,REFERENCES,TRIGGER,TRUNCATE,UPDATE |
| public.households | authenticated | DELETE,INSERT,REFERENCES,TRIGGER,TRUNCATE,UPDATE |
| public.households | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.insurance_configs | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.insurance_configs | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.insurance_configs | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.invite_codes | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.invite_codes | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.invite_codes | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.invoices | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.invoices | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.invoices | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.kiosk_photos | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.kiosk_photos | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.kiosk_photos | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.kiosk_reminders | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.kiosk_reminders | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.kiosk_reminders | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.kpi_targets | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.kpi_targets | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.kpi_targets | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.leihboerse_items | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.leihboerse_items | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.leihboerse_items | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.lost_found | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.lost_found | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.lost_found | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.map_houses | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.map_houses | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.map_houses | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.marketplace_items | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.marketplace_items | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.marketplace_items | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.meal_signups | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.meal_signups | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.meal_signups | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.moderation_actions | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.moderation_actions | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.moderation_actions | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.moderation_config | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.moderation_config | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.moderation_config | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.moderation_queue | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.moderation_queue | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.moderation_queue | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.monthly_summaries | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.monthly_summaries | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.monthly_summaries | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.municipal_announcements | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.municipal_announcements | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.municipal_announcements | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.municipal_config | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.municipal_config | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.municipal_config | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.municipal_report_comments | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.municipal_report_comments | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.municipal_report_comments | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.municipal_reports | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.municipal_reports | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.municipal_reports | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.neighbor_connections | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.neighbor_connections | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.neighbor_connections | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.neighbor_invitations | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.neighbor_invitations | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.neighbor_invitations | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.neighbor_vouches | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.neighbor_vouches | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.neighbor_vouches | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.neighborhood_helpers | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.neighborhood_helpers | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.neighborhood_helpers | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.news_items | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.news_items | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.news_items | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.nina_warnings | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.nina_warnings | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.nina_warnings | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.notifications | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.notifications | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.notifications | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.onboarding_steps | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.onboarding_steps | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.onboarding_steps | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.org_audit_log | anon | INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE |
| public.org_audit_log | authenticated | INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE |
| public.org_audit_log | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.org_members | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.org_members | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.org_members | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.org_neighbors | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.org_neighbors | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.org_neighbors | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.organizations | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.organizations | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.organizations | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.paketannahme | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.paketannahme | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.paketannahme | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.passkey_credentials | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.passkey_credentials | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.passkey_credentials | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.pflege_resident_assignments | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.pflege_resident_assignments | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.pflege_resident_assignments | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.plus_trial_grants | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.plus_trial_grants | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.plus_trial_grants | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.points_log | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.points_log | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.points_log | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.poll_options | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.poll_options | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.poll_options | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.poll_votes | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.poll_votes | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.poll_votes | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.polls | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.polls | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.polls | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.practice_announcements | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.practice_announcements | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.practice_announcements | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.practice_invitations | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.practice_invitations | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.practice_invitations | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.practice_members | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.practice_members | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.practice_members | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.practices | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.practices | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.practices | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.prevention_course_content | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.prevention_course_content | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.prevention_course_content | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.prevention_courses | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.prevention_courses | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.prevention_courses | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.prevention_enrollments | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.prevention_enrollments | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.prevention_enrollments | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.prevention_group_calls | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.prevention_group_calls | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.prevention_group_calls | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.prevention_messages | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.prevention_messages | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.prevention_messages | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.prevention_payments | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.prevention_payments | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.prevention_payments | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.prevention_reviews | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.prevention_reviews | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.prevention_reviews | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.prevention_sessions | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.prevention_sessions | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.prevention_sessions | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.prevention_visibility_consent | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.prevention_visibility_consent | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.prevention_visibility_consent | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.push_subscriptions | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.push_subscriptions | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.push_subscriptions | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.quarter_admins | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.quarter_admins | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.quarter_admins | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.quarter_collection_areas | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.quarter_collection_areas | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.quarter_collection_areas | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.quarter_lotsen | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.quarter_lotsen | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.quarter_lotsen | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.quarters | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.quarters | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.quarters | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.quartier_info_cache | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.quartier_info_cache | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.quartier_info_cache | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.recall_reminders | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.recall_reminders | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.recall_reminders | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.reputation_points | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.reputation_points | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.reputation_points | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.retention_policies | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.retention_policies | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.retention_policies | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.security_events | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.security_events | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.security_events | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.security_forensics | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.security_forensics | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.security_forensics | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.senior_checkins | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.senior_checkins | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.senior_checkins | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.shared_meals | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.shared_meals | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.shared_meals | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.skills | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.skills | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.skills | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.spatial_ref_sys | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.spatial_ref_sys | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.spatial_ref_sys | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.speed_dial_favorites | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.speed_dial_favorites | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.speed_dial_favorites | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.tech_incidents | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.tech_incidents | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.tech_incidents | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.test_results | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.test_results | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.test_results | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.test_sessions | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.test_sessions | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.test_sessions | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.tip_confirmations | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.tip_confirmations | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.tip_confirmations | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.tip_reviews | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.tip_reviews | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.tip_reviews | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.user_badges | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.user_badges | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.user_badges | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.user_blocks | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.user_blocks | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.user_blocks | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.user_memory_audit_log | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.user_memory_audit_log | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.user_memory_audit_log | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.user_memory_consents | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.user_memory_consents | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.user_memory_consents | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.user_memory_facts | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.user_memory_facts | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.user_memory_facts | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.users | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.users | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.users | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.vacation_modes | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.vacation_modes | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.vacation_modes | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.verification_requests | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.verification_requests | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.verification_requests | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.video_calls | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.video_calls | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.video_calls | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.video_credit_usage | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.video_credit_usage | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.video_credit_usage | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.video_credits | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.video_credits | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.video_credits | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.warning_cache | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.warning_cache | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.warning_cache | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.waste_collection_areas | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.waste_collection_areas | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.waste_collection_areas | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.waste_collection_dates | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.waste_collection_dates | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.waste_collection_dates | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.waste_reminders | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.waste_reminders | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.waste_reminders | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.waste_schedules | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.waste_schedules | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.waste_schedules | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.waste_source_registry | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.waste_source_registry | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.waste_source_registry | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.waste_sync_log | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.waste_sync_log | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.waste_sync_log | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.webhook_events | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.webhook_events | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.webhook_events | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.youth_badges | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.youth_badges | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.youth_badges | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.youth_earned_badges | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.youth_earned_badges | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.youth_earned_badges | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.youth_guardian_consents | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.youth_guardian_consents | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.youth_guardian_consents | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.youth_moderation_log | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.youth_moderation_log | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.youth_moderation_log | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.youth_points_ledger | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.youth_points_ledger | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.youth_points_ledger | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.youth_profiles | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.youth_profiles | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.youth_profiles | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.youth_tasks | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.youth_tasks | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| public.youth_tasks | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
