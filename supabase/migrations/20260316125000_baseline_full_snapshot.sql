-- Baseline snapshot: 83 prod-only tables (Version 20260316125000)
-- Purpose: unlock Supabase branch replay by providing CREATE TABLE + RLS + missing helper functions + policies
-- Rules:
--   CREATE TABLE IF NOT EXISTS, inline PK + UNIQUE only
--   FK, CHECK, indexes: intentionally skipped (Prod has them; replay does not need them)
--   5 RLS helper functions (CREATE OR REPLACE) that live in Prod pg_proc but are NOT in schema_migrations
--   Policies only included when NOT re-created by a later CREATE POLICY in schema_migrations
--   All CREATE POLICY wrapped in idempotent DO $$...$$ guards
-- Ur-Spalten = Prod columns MINUS columns added later via ALTER TABLE ADD COLUMN in schema_migrations

BEGIN;

-- Enable PostGIS before any CREATE TABLE that uses geometry/geography types
-- (quarters has geo_boundary/geo_center of type geometry in Prod; migration 079 enables
--  postgis and adds OTHER geography columns, but not these two.)
CREATE EXTENSION IF NOT EXISTS postgis;

-- =============================================================
-- Part 1: CREATE TABLE IF NOT EXISTS + ENABLE RLS (all 83 tables)
-- =============================================================

-- ----- access_codes -----
CREATE TABLE IF NOT EXISTS public.access_codes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code varchar(6) NOT NULL,
  user_id uuid,
  created_by uuid NOT NULL,
  created_by_role text NOT NULL,
  quarter_id text,
  patient_name text NOT NULL,
  patient_birth_date date,
  expires_at timestamptz DEFAULT (now() + '30 days'::interval) NOT NULL,
  used_at timestamptz,
  failed_attempts integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT access_codes_pkey PRIMARY KEY (id),
  CONSTRAINT access_codes_code_key UNIQUE (code)
);
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- ----- admin_audit_log -----
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  reason text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT admin_audit_log_pkey PRIMARY KEY (id)
);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- ----- admin_expenses -----
CREATE TABLE IF NOT EXISTS public.admin_expenses (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  amount_cents integer NOT NULL,
  currency text DEFAULT 'EUR'::text,
  receipt_url text,
  receipt_id text,
  vendor text,
  date date NOT NULL,
  admin_id uuid,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT admin_expenses_pkey PRIMARY KEY (id)
);
ALTER TABLE public.admin_expenses ENABLE ROW LEVEL SECURITY;

-- ----- audit_log -----
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  action text NOT NULL,
  actor_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  request_id uuid,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT audit_log_pkey PRIMARY KEY (id)
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ----- bug_reports -----
CREATE TABLE IF NOT EXISTS public.bug_reports (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  quarter_id uuid,
  page_url text NOT NULL,
  page_title text,
  screenshot_url text,
  console_errors jsonb DEFAULT '[]'::jsonb,
  browser_info jsonb DEFAULT '{}'::jsonb,
  page_meta jsonb DEFAULT '{}'::jsonb,
  user_comment text,
  status text DEFAULT 'new'::text,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  CONSTRAINT bug_reports_pkey PRIMARY KEY (id)
);
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- ----- care_appointments -----
CREATE TABLE IF NOT EXISTS public.care_appointments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  senior_id uuid NOT NULL,
  title text NOT NULL,
  type text DEFAULT 'other'::text,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer DEFAULT 60,
  location text,
  reminder_minutes_before integer[] DEFAULT '{60,15}'::integer[],
  recurrence jsonb,
  managed_by uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  visibility text DEFAULT 'private'::text,
  CONSTRAINT care_appointments_pkey PRIMARY KEY (id)
);
ALTER TABLE public.care_appointments ENABLE ROW LEVEL SECURITY;

-- ----- care_audit_log -----
CREATE TABLE IF NOT EXISTS public.care_audit_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  senior_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  event_type text NOT NULL,
  reference_type text,
  reference_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT care_audit_log_pkey PRIMARY KEY (id)
);
ALTER TABLE public.care_audit_log ENABLE ROW LEVEL SECURITY;

-- ----- care_checkins -----
CREATE TABLE IF NOT EXISTS public.care_checkins (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  senior_id uuid NOT NULL,
  status text NOT NULL,
  mood text,
  note text,
  scheduled_at timestamptz NOT NULL,
  completed_at timestamptz,
  reminder_sent_at timestamptz,
  escalated boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT care_checkins_pkey PRIMARY KEY (id)
);
ALTER TABLE public.care_checkins ENABLE ROW LEVEL SECURITY;

-- ----- care_documents -----
CREATE TABLE IF NOT EXISTS public.care_documents (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  senior_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  period_start date,
  period_end date,
  generated_by uuid NOT NULL,
  storage_path text NOT NULL,
  file_size_bytes integer,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT care_documents_pkey PRIMARY KEY (id)
);
ALTER TABLE public.care_documents ENABLE ROW LEVEL SECURITY;

-- ----- care_helpers -----
CREATE TABLE IF NOT EXISTS public.care_helpers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL,
  verification_status text DEFAULT 'pending'::text,
  verified_by uuid,
  assigned_seniors uuid[] DEFAULT '{}'::uuid[],
  availability jsonb,
  skills text[] DEFAULT '{}'::text[],
  response_count integer DEFAULT 0,
  avg_response_minutes double precision,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT care_helpers_pkey PRIMARY KEY (id),
  CONSTRAINT care_helpers_user_id_key UNIQUE (user_id)
);
ALTER TABLE public.care_helpers ENABLE ROW LEVEL SECURITY;

-- ----- care_medication_logs -----
CREATE TABLE IF NOT EXISTS public.care_medication_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  medication_id uuid NOT NULL,
  senior_id uuid NOT NULL,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL,
  confirmed_at timestamptz,
  snoozed_until timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT care_medication_logs_pkey PRIMARY KEY (id)
);
ALTER TABLE public.care_medication_logs ENABLE ROW LEVEL SECURITY;

-- ----- care_medications -----
CREATE TABLE IF NOT EXISTS public.care_medications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  senior_id uuid NOT NULL,
  name text NOT NULL,
  dosage text,
  schedule jsonb NOT NULL,
  instructions text,
  managed_by uuid,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT care_medications_pkey PRIMARY KEY (id)
);
ALTER TABLE public.care_medications ENABLE ROW LEVEL SECURITY;

-- ----- care_profiles -----
CREATE TABLE IF NOT EXISTS public.care_profiles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  care_level text DEFAULT 'none'::text,
  emergency_contacts jsonb DEFAULT '[]'::jsonb,
  medical_notes text,
  preferred_hospital text,
  insurance_number text,
  checkin_times jsonb DEFAULT '["08:00", "20:00"]'::jsonb,
  checkin_enabled boolean DEFAULT true,
  escalation_config jsonb DEFAULT '{"escalate_to_level_2_after_minutes": 5, "escalate_to_level_3_after_minutes": 15, "escalate_to_level_4_after_minutes": 30}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT care_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT care_profiles_user_id_key UNIQUE (user_id)
);
ALTER TABLE public.care_profiles ENABLE ROW LEVEL SECURITY;

-- ----- care_profiles_hilfe -----
CREATE TABLE IF NOT EXISTS public.care_profiles_hilfe (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  care_level integer,
  insurance_name text NOT NULL,
  insurance_number_encrypted text NOT NULL,
  monthly_budget_cents integer DEFAULT 13100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT care_profiles_hilfe_pkey PRIMARY KEY (id),
  CONSTRAINT care_profiles_hilfe_user_id_key UNIQUE (user_id)
);
ALTER TABLE public.care_profiles_hilfe ENABLE ROW LEVEL SECURITY;

-- ----- care_shopping_requests -----
CREATE TABLE IF NOT EXISTS public.care_shopping_requests (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  requester_id uuid NOT NULL,
  quarter_id uuid NOT NULL,
  items jsonb DEFAULT '[]'::jsonb NOT NULL,
  note text,
  status text DEFAULT 'open'::text NOT NULL,
  claimed_by uuid,
  claimed_at timestamptz,
  due_date date,
  delivered_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT care_shopping_requests_pkey PRIMARY KEY (id)
);
ALTER TABLE public.care_shopping_requests ENABLE ROW LEVEL SECURITY;

-- ----- care_sos_alerts -----
CREATE TABLE IF NOT EXISTS public.care_sos_alerts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  senior_id uuid NOT NULL,
  category text NOT NULL,
  status text DEFAULT 'triggered'::text NOT NULL,
  current_escalation_level integer DEFAULT 1,
  escalated_at timestamptz[] DEFAULT '{}'::timestamp with time zone[],
  accepted_by uuid,
  resolved_by uuid,
  resolved_at timestamptz,
  notes text,
  source text DEFAULT 'app'::text,
  created_at timestamptz DEFAULT now(),
  quarter_id uuid,
  CONSTRAINT care_sos_alerts_pkey PRIMARY KEY (id)
);
ALTER TABLE public.care_sos_alerts ENABLE ROW LEVEL SECURITY;

-- ----- care_sos_responses -----
CREATE TABLE IF NOT EXISTS public.care_sos_responses (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  sos_alert_id uuid NOT NULL,
  helper_id uuid NOT NULL,
  response_type text NOT NULL,
  eta_minutes integer,
  note text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT care_sos_responses_pkey PRIMARY KEY (id)
);
ALTER TABLE public.care_sos_responses ENABLE ROW LEVEL SECURITY;

-- ----- care_subscriptions -----
CREATE TABLE IF NOT EXISTS public.care_subscriptions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  plan text DEFAULT 'free'::text,
  status text DEFAULT 'trial'::text,
  trial_ends_at timestamptz,
  current_period_start date,
  current_period_end date,
  payment_provider text,
  external_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT care_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT care_subscriptions_user_id_key UNIQUE (user_id)
);
ALTER TABLE public.care_subscriptions ENABLE ROW LEVEL SECURITY;

-- ----- care_tasks -----
CREATE TABLE IF NOT EXISTS public.care_tasks (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  creator_id uuid NOT NULL,
  quarter_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  category text DEFAULT 'other'::text NOT NULL,
  urgency text DEFAULT 'normal'::text,
  preferred_date date,
  preferred_time_from text,
  preferred_time_to text,
  status text DEFAULT 'open'::text NOT NULL,
  claimed_by uuid,
  claimed_at timestamptz,
  completed_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT care_tasks_pkey PRIMARY KEY (id)
);
ALTER TABLE public.care_tasks ENABLE ROW LEVEL SECURITY;

-- ----- citizen_reports -----
CREATE TABLE IF NOT EXISTS public.citizen_reports (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  org_id uuid,
  category text DEFAULT 'sonstiges'::text NOT NULL,
  title text NOT NULL,
  description text,
  latitude double precision,
  longitude double precision,
  photo_url text,
  status text DEFAULT 'offen'::text NOT NULL,
  priority text DEFAULT 'normal'::text NOT NULL,
  assigned_to text,
  internal_notes text,
  resolved_at timestamptz,
  reported_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT citizen_reports_pkey PRIMARY KEY (id)
);
ALTER TABLE public.citizen_reports ENABLE ROW LEVEL SECURITY;

-- ----- civic_announcements -----
CREATE TABLE IF NOT EXISTS public.civic_announcements (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  org_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'info'::text NOT NULL,
  priority text DEFAULT 'normal'::text NOT NULL,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT civic_announcements_pkey PRIMARY KEY (id)
);
ALTER TABLE public.civic_announcements ENABLE ROW LEVEL SECURITY;

-- ----- civic_appointments -----
CREATE TABLE IF NOT EXISTS public.civic_appointments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  citizen_name text NOT NULL,
  department text,
  service_type text,
  scheduled_at timestamptz NOT NULL,
  notes text,
  status text DEFAULT 'angefragt'::text NOT NULL,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT civic_appointments_pkey PRIMARY KEY (id)
);
ALTER TABLE public.civic_appointments ENABLE ROW LEVEL SECURITY;

-- ----- civic_audit_log -----
CREATE TABLE IF NOT EXISTS public.civic_audit_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  org_id uuid,
  user_id uuid,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT civic_audit_log_pkey PRIMARY KEY (id)
);
ALTER TABLE public.civic_audit_log ENABLE ROW LEVEL SECURITY;

-- ----- civic_document_requests -----
CREATE TABLE IF NOT EXISTS public.civic_document_requests (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  document_type text NOT NULL,
  citizen_name text NOT NULL,
  citizen_email text,
  details text,
  status text DEFAULT 'beantragt'::text NOT NULL,
  requested_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT civic_document_requests_pkey PRIMARY KEY (id)
);
ALTER TABLE public.civic_document_requests ENABLE ROW LEVEL SECURITY;

-- ----- civic_events -----
CREATE TABLE IF NOT EXISTS public.civic_events (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  event_time text,
  location text,
  category text DEFAULT 'sonstiges'::text NOT NULL,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT civic_events_pkey PRIMARY KEY (id)
);
ALTER TABLE public.civic_events ENABLE ROW LEVEL SECURITY;

-- ----- civic_members -----
CREATE TABLE IF NOT EXISTS public.civic_members (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  org_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text DEFAULT 'civic_viewer'::text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT civic_members_pkey PRIMARY KEY (id),
  CONSTRAINT civic_members_org_id_user_id_key UNIQUE (org_id, user_id)
);
ALTER TABLE public.civic_members ENABLE ROW LEVEL SECURITY;

-- ----- civic_organizations -----
CREATE TABLE IF NOT EXISTS public.civic_organizations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  type text DEFAULT 'kommune'::text NOT NULL,
  municipality text,
  hr_vr_number text,
  verification_status text DEFAULT 'pending'::text NOT NULL,
  features jsonb DEFAULT '{"umfragen": false, "dokumente": false, "baustellen": true, "dwd_wetter": false, "fit_connect": false, "krisen_push": true, "pegelonline": false, "maengelmelder": true, "terminbuchung": false, "nina_warnungen": false, "veranstaltungen": false, "bekanntmachungen": true, "eid_verifizierung": false}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  address text,
  latitude double precision,
  longitude double precision,
  CONSTRAINT civic_organizations_pkey PRIMARY KEY (id)
);
ALTER TABLE public.civic_organizations ENABLE ROW LEVEL SECURITY;

-- ----- civic_survey_options -----
CREATE TABLE IF NOT EXISTS public.civic_survey_options (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  survey_id uuid NOT NULL,
  label text NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  vote_count integer DEFAULT 0 NOT NULL,
  CONSTRAINT civic_survey_options_pkey PRIMARY KEY (id)
);
ALTER TABLE public.civic_survey_options ENABLE ROW LEVEL SECURITY;

-- ----- civic_survey_votes -----
CREATE TABLE IF NOT EXISTS public.civic_survey_votes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  survey_id uuid NOT NULL,
  option_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT civic_survey_votes_pkey PRIMARY KEY (id),
  CONSTRAINT civic_survey_votes_survey_id_user_id_key UNIQUE (survey_id, user_id)
);
ALTER TABLE public.civic_survey_votes ENABLE ROW LEVEL SECURITY;

-- ----- civic_surveys -----
CREATE TABLE IF NOT EXISTS public.civic_surveys (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  anonymous boolean DEFAULT false NOT NULL,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT civic_surveys_pkey PRIMARY KEY (id)
);
ALTER TABLE public.civic_surveys ENABLE ROW LEVEL SECURITY;

-- ----- claude_messages -----
CREATE TABLE IF NOT EXISTS public.claude_messages (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  sender text NOT NULL,
  recipient text NOT NULL,
  subject text,
  body text NOT NULL,
  status text DEFAULT 'unread'::text,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz,
  CONSTRAINT claude_messages_pkey PRIMARY KEY (id)
);
ALTER TABLE public.claude_messages ENABLE ROW LEVEL SECURITY;

-- ----- community_tips -----
CREATE TABLE IF NOT EXISTS public.community_tips (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  business_name text,
  description text NOT NULL,
  location_hint text,
  contact_hint text,
  confirmation_count integer DEFAULT 0 NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT community_tips_pkey PRIMARY KEY (id)
);
ALTER TABLE public.community_tips ENABLE ROW LEVEL SECURITY;

-- ----- construction_sites -----
CREATE TABLE IF NOT EXISTS public.construction_sites (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  org_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  start_date date NOT NULL,
  end_date date,
  detour_info text,
  contact_name text,
  contact_phone text,
  status text DEFAULT 'active'::text NOT NULL,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT construction_sites_pkey PRIMARY KEY (id)
);
ALTER TABLE public.construction_sites ENABLE ROW LEVEL SECURITY;

-- ----- consultation_consents -----
CREATE TABLE IF NOT EXISTS public.consultation_consents (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  consent_version text DEFAULT 'v1'::text NOT NULL,
  consented_at timestamptz DEFAULT now() NOT NULL,
  provider_type text NOT NULL,
  CONSTRAINT consultation_consents_pkey PRIMARY KEY (id),
  CONSTRAINT consultation_consents_user_id_consent_version_provider_type_key UNIQUE (user_id, consent_version, provider_type)
);
ALTER TABLE public.consultation_consents ENABLE ROW LEVEL SECURITY;

-- ----- consultation_slots -----
CREATE TABLE IF NOT EXISTS public.consultation_slots (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  quarter_id uuid NOT NULL,
  provider_type text NOT NULL,
  host_user_id uuid,
  host_name text NOT NULL,
  title text DEFAULT 'Sprechstunde'::text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer DEFAULT 15 NOT NULL,
  status text DEFAULT 'scheduled'::text NOT NULL,
  booked_by uuid,
  booked_at timestamptz,
  room_id text,
  join_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  counter_proposed_at timestamptz,
  previous_scheduled_at timestamptz,
  status_changed_at timestamptz DEFAULT now(),
  cancelled_by uuid,
  so_appointment_id text,
  CONSTRAINT consultation_slots_pkey PRIMARY KEY (id)
);
ALTER TABLE public.consultation_slots ENABLE ROW LEVEL SECURITY;

-- ----- conversations -----
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  participant_1 uuid NOT NULL,
  participant_2 uuid NOT NULL,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now() NOT NULL,
  quarter_id uuid,
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_participant_1_participant_2_key UNIQUE (participant_1, participant_2)
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- ----- crisis_alerts -----
CREATE TABLE IF NOT EXISTS public.crisis_alerts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  org_id uuid NOT NULL,
  type text DEFAULT 'sonstiges'::text NOT NULL,
  severity text DEFAULT 'mittel'::text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  instructions text,
  affected_quarters text[],
  active boolean DEFAULT true NOT NULL,
  deactivated_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT crisis_alerts_pkey PRIMARY KEY (id)
);
ALTER TABLE public.crisis_alerts ENABLE ROW LEVEL SECURITY;

-- ----- crisis_templates -----
CREATE TABLE IF NOT EXISTS public.crisis_templates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  instructions text,
  severity text DEFAULT 'hoch'::text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT crisis_templates_pkey PRIMARY KEY (id)
);
ALTER TABLE public.crisis_templates ENABLE ROW LEVEL SECURITY;

-- ----- cron_heartbeats -----
CREATE TABLE IF NOT EXISTS public.cron_heartbeats (
  job_id text NOT NULL,
  last_run_at timestamptz DEFAULT now() NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT cron_heartbeats_pkey PRIMARY KEY (job_id)
);
ALTER TABLE public.cron_heartbeats ENABLE ROW LEVEL SECURITY;

-- ----- cron_job_runs -----
CREATE TABLE IF NOT EXISTS public.cron_job_runs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  job_name text NOT NULL,
  started_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz,
  status text DEFAULT 'running'::text NOT NULL,
  result jsonb,
  error text,
  CONSTRAINT cron_job_runs_pkey PRIMARY KEY (id)
);
ALTER TABLE public.cron_job_runs ENABLE ROW LEVEL SECURITY;

-- ----- device_heartbeats -----
CREATE TABLE IF NOT EXISTS public.device_heartbeats (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  device_token_id uuid NOT NULL,
  ram_percent smallint NOT NULL,
  cpu_temp_celsius real NOT NULL,
  restart_count smallint DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT device_heartbeats_pkey PRIMARY KEY (id)
);
ALTER TABLE public.device_heartbeats ENABLE ROW LEVEL SECURITY;

-- ----- device_tokens -----
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  household_id uuid NOT NULL,
  token text DEFAULT encode(gen_random_bytes(32), 'hex'::text) NOT NULL,
  device_name text DEFAULT 'reTerminal E1001'::text NOT NULL,
  last_seen_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  token_hash text,
  CONSTRAINT device_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT device_tokens_token_key UNIQUE (token)
);
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- ----- direct_messages -----
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT direct_messages_pkey PRIMARY KEY (id)
);
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- ----- event_participants -----
CREATE TABLE IF NOT EXISTS public.event_participants (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text DEFAULT 'going'::text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT event_participants_pkey PRIMARY KEY (id),
  CONSTRAINT event_participants_event_id_user_id_key UNIQUE (event_id, user_id)
);
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- ----- events -----
CREATE TABLE IF NOT EXISTS public.events (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  location text,
  event_date date NOT NULL,
  event_time time,
  end_time time,
  category text DEFAULT 'other'::text NOT NULL,
  max_participants integer,
  created_at timestamptz DEFAULT now() NOT NULL,
  quarter_id uuid,
  CONSTRAINT events_pkey PRIMARY KEY (id)
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- ----- expert_endorsements -----
CREATE TABLE IF NOT EXISTS public.expert_endorsements (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  expert_user_id uuid NOT NULL,
  endorser_user_id uuid NOT NULL,
  skill_category text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT expert_endorsements_pkey PRIMARY KEY (id),
  CONSTRAINT expert_endorsements_expert_user_id_endorser_user_id_skill_c_key UNIQUE (expert_user_id, endorser_user_id, skill_category)
);
ALTER TABLE public.expert_endorsements ENABLE ROW LEVEL SECURITY;

-- ----- expert_reviews -----
CREATE TABLE IF NOT EXISTS public.expert_reviews (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  expert_user_id uuid NOT NULL,
  reviewer_user_id uuid NOT NULL,
  skill_category text NOT NULL,
  rating integer NOT NULL,
  comment text,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT expert_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT expert_reviews_expert_user_id_reviewer_user_id_skill_catego_key UNIQUE (expert_user_id, reviewer_user_id, skill_category)
);
ALTER TABLE public.expert_reviews ENABLE ROW LEVEL SECURITY;

-- ----- federal_state_rules -----
CREATE TABLE IF NOT EXISTS public.federal_state_rules (
  state_code text NOT NULL,
  state_name text NOT NULL,
  is_available boolean DEFAULT true,
  training_required boolean DEFAULT false,
  training_hours integer,
  min_age integer DEFAULT 16,
  max_hourly_rate_cents integer,
  max_concurrent_clients integer,
  relationship_exclusion_degree integer DEFAULT 2,
  same_household_excluded boolean DEFAULT true,
  registration_authority text,
  official_form_url text,
  notes text,
  research_status text DEFAULT 'pending_research'::text,
  last_checked date,
  recognition_type text,
  formal_pre_registration boolean,
  hourly_rate_min_cents integer,
  hourly_rate_max_cents integer,
  hourly_rate_note text,
  reimbursement_principle text,
  direct_payment_possible boolean,
  allowed_household boolean,
  allowed_cleaning boolean,
  allowed_shopping boolean,
  allowed_escort boolean,
  allowed_leisure boolean,
  allowed_snow_removal boolean,
  allowed_lawn_mowing boolean,
  insurance_note text,
  tax_note text,
  primary_official_url text,
  secondary_official_url text,
  CONSTRAINT federal_state_rules_pkey PRIMARY KEY (state_code)
);
ALTER TABLE public.federal_state_rules ENABLE ROW LEVEL SECURITY;

-- ----- help_matches -----
CREATE TABLE IF NOT EXISTS public.help_matches (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  request_id uuid NOT NULL,
  helper_id uuid NOT NULL,
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT help_matches_pkey PRIMARY KEY (id)
);
ALTER TABLE public.help_matches ENABLE ROW LEVEL SECURITY;

-- ----- help_monthly_reports -----
CREATE TABLE IF NOT EXISTS public.help_monthly_reports (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  helper_id uuid NOT NULL,
  resident_id uuid NOT NULL,
  month_year text NOT NULL,
  pdf_url text NOT NULL,
  total_sessions integer NOT NULL,
  total_amount_cents integer NOT NULL,
  sent_to_email text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT help_monthly_reports_pkey PRIMARY KEY (id),
  CONSTRAINT help_monthly_reports_helper_id_resident_id_month_year_key UNIQUE (helper_id, resident_id, month_year)
);
ALTER TABLE public.help_monthly_reports ENABLE ROW LEVEL SECURITY;

-- ----- help_receipts -----
CREATE TABLE IF NOT EXISTS public.help_receipts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  session_id uuid NOT NULL,
  pdf_url text NOT NULL,
  submitted_to_insurer boolean DEFAULT false,
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT help_receipts_pkey PRIMARY KEY (id)
);
ALTER TABLE public.help_receipts ENABLE ROW LEVEL SECURITY;

-- ----- help_responses -----
CREATE TABLE IF NOT EXISTS public.help_responses (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  help_request_id uuid NOT NULL,
  responder_user_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT help_responses_pkey PRIMARY KEY (id)
);
ALTER TABLE public.help_responses ENABLE ROW LEVEL SECURITY;

-- ----- help_sessions -----
CREATE TABLE IF NOT EXISTS public.help_sessions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  match_id uuid NOT NULL,
  session_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  duration_minutes integer NOT NULL,
  activity_category text NOT NULL,
  activity_description text,
  hourly_rate_cents integer NOT NULL,
  total_amount_cents integer NOT NULL,
  helper_signature_url text,
  resident_signature_url text,
  status text DEFAULT 'draft'::text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT help_sessions_pkey PRIMARY KEY (id)
);
ALTER TABLE public.help_sessions ENABLE ROW LEVEL SECURITY;

-- ----- helper_connections -----
CREATE TABLE IF NOT EXISTS public.helper_connections (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  helper_id uuid NOT NULL,
  resident_id uuid NOT NULL,
  source text NOT NULL,
  invite_code text,
  confirmed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT helper_connections_pkey PRIMARY KEY (id),
  CONSTRAINT helper_connections_helper_id_resident_id_key UNIQUE (helper_id, resident_id)
);
ALTER TABLE public.helper_connections ENABLE ROW LEVEL SECURITY;

-- ----- invite_codes -----
CREATE TABLE IF NOT EXISTS public.invite_codes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  created_by uuid NOT NULL,
  used_by uuid,
  created_at timestamptz DEFAULT now(),
  used_at timestamptz,
  CONSTRAINT invite_codes_pkey PRIMARY KEY (id),
  CONSTRAINT invite_codes_code_key UNIQUE (code)
);
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- ----- invoices -----
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  invoice_number text NOT NULL,
  type text NOT NULL,
  status text DEFAULT 'draft'::text,
  counterparty text NOT NULL,
  counterparty_address text,
  counterparty_tax_id text,
  line_items jsonb DEFAULT '[]'::jsonb NOT NULL,
  subtotal_cents integer NOT NULL,
  tax_cents integer NOT NULL,
  total_cents integer NOT NULL,
  currency text DEFAULT 'EUR'::text,
  issued_at date,
  due_at date,
  paid_at timestamptz,
  stripe_invoice_id text,
  pdf_url text,
  e_invoice_xml text,
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number)
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- ----- kiosk_photos -----
CREATE TABLE IF NOT EXISTS public.kiosk_photos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  household_id uuid NOT NULL,
  uploaded_by uuid NOT NULL,
  storage_path text NOT NULL,
  caption text,
  pinned boolean DEFAULT false NOT NULL,
  visible boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT kiosk_photos_pkey PRIMARY KEY (id)
);
ALTER TABLE public.kiosk_photos ENABLE ROW LEVEL SECURITY;

-- ----- kiosk_reminders -----
CREATE TABLE IF NOT EXISTS public.kiosk_reminders (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  household_id uuid NOT NULL,
  created_by uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  scheduled_at timestamptz,
  acknowledged_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT kiosk_reminders_pkey PRIMARY KEY (id)
);
ALTER TABLE public.kiosk_reminders ENABLE ROW LEVEL SECURITY;

-- ----- leihboerse_items -----
CREATE TABLE IF NOT EXISTS public.leihboerse_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  type text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  description text,
  image_url text,
  deposit text,
  available_until date,
  status text DEFAULT 'active'::text NOT NULL,
  reserved_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  quarter_id uuid,
  CONSTRAINT leihboerse_items_pkey PRIMARY KEY (id)
);
ALTER TABLE public.leihboerse_items ENABLE ROW LEVEL SECURITY;

-- ----- map_houses -----
CREATE TABLE IF NOT EXISTS public.map_houses (
  id text NOT NULL,
  house_number text NOT NULL,
  street_code text NOT NULL,
  x integer NOT NULL,
  y integer NOT NULL,
  default_color text DEFAULT 'green'::text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  household_id uuid,
  quarter_id uuid,
  lat double precision,
  lng double precision,
  CONSTRAINT map_houses_pkey PRIMARY KEY (id)
);
ALTER TABLE public.map_houses ENABLE ROW LEVEL SECURITY;

-- ----- neighbor_connections -----
CREATE TABLE IF NOT EXISTS public.neighbor_connections (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  requester_id uuid NOT NULL,
  target_id uuid NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  message text,
  created_at timestamptz DEFAULT now() NOT NULL,
  responded_at timestamptz,
  CONSTRAINT neighbor_connections_pkey PRIMARY KEY (id),
  CONSTRAINT neighbor_connections_requester_id_target_id_key UNIQUE (requester_id, target_id)
);
ALTER TABLE public.neighbor_connections ENABLE ROW LEVEL SECURITY;

-- ----- neighbor_invitations -----
CREATE TABLE IF NOT EXISTS public.neighbor_invitations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  inviter_id uuid NOT NULL,
  household_id uuid NOT NULL,
  invite_method text NOT NULL,
  invite_target text,
  invite_code text NOT NULL,
  status text DEFAULT 'sent'::text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  accepted_at timestamptz,
  accepted_by uuid,
  recipient_phone text,
  quarter_id uuid,
  converted_user_id uuid,
  converted_at timestamptz,
  expires_at timestamptz DEFAULT (now() + '30 days'::interval),
  sms_sent boolean DEFAULT false,
  sms_sid text,
  CONSTRAINT neighbor_invitations_pkey PRIMARY KEY (id),
  CONSTRAINT neighbor_invitations_invite_code_key UNIQUE (invite_code)
);
ALTER TABLE public.neighbor_invitations ENABLE ROW LEVEL SECURITY;

-- ----- neighborhood_helpers -----
CREATE TABLE IF NOT EXISTS public.neighborhood_helpers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  federal_state text NOT NULL,
  date_of_birth date NOT NULL,
  hourly_rate_cents integer NOT NULL,
  certification_url text,
  verified boolean DEFAULT false,
  relationship_check boolean DEFAULT false NOT NULL,
  household_check boolean DEFAULT false NOT NULL,
  terms_accepted_at timestamptz,
  active_client_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  subscription_status text DEFAULT 'free'::text,
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_receipt_used boolean DEFAULT false,
  subscription_paused_at timestamptz,
  subscription_cancelled_at timestamptz,
  CONSTRAINT neighborhood_helpers_pkey PRIMARY KEY (id),
  CONSTRAINT neighborhood_helpers_user_id_key UNIQUE (user_id)
);
ALTER TABLE public.neighborhood_helpers ENABLE ROW LEVEL SECURITY;

-- ----- onboarding_steps -----
CREATE TABLE IF NOT EXISTS public.onboarding_steps (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  step text NOT NULL,
  sent_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT onboarding_steps_pkey PRIMARY KEY (id),
  CONSTRAINT onboarding_steps_user_id_step_key UNIQUE (user_id, step)
);
ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;

-- ----- paketannahme -----
CREATE TABLE IF NOT EXISTS public.paketannahme (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  available_date date DEFAULT CURRENT_DATE NOT NULL,
  available_from time,
  available_until time,
  note text,
  created_at timestamptz DEFAULT now() NOT NULL,
  quarter_id uuid,
  CONSTRAINT paketannahme_pkey PRIMARY KEY (id),
  CONSTRAINT paketannahme_user_id_available_date_key UNIQUE (user_id, available_date)
);
ALTER TABLE public.paketannahme ENABLE ROW LEVEL SECURITY;

-- ----- poll_options -----
CREATE TABLE IF NOT EXISTS public.poll_options (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  poll_id uuid NOT NULL,
  label text NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  CONSTRAINT poll_options_pkey PRIMARY KEY (id)
);
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

-- ----- poll_votes -----
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  poll_id uuid NOT NULL,
  option_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT poll_votes_pkey PRIMARY KEY (id),
  CONSTRAINT poll_votes_poll_id_option_id_user_id_key UNIQUE (poll_id, option_id, user_id)
);
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- ----- polls -----
CREATE TABLE IF NOT EXISTS public.polls (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  question text NOT NULL,
  multiple_choice boolean DEFAULT false NOT NULL,
  closes_at timestamptz,
  status text DEFAULT 'active'::text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  quarter_id uuid,
  CONSTRAINT polls_pkey PRIMARY KEY (id)
);
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

-- ----- practice_announcements -----
CREATE TABLE IF NOT EXISTS public.practice_announcements (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  doctor_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  status text DEFAULT 'draft'::text NOT NULL,
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT practice_announcements_pkey PRIMARY KEY (id)
);
ALTER TABLE public.practice_announcements ENABLE ROW LEVEL SECURITY;

-- ----- practice_invitations -----
CREATE TABLE IF NOT EXISTS public.practice_invitations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  practice_id uuid NOT NULL,
  email text NOT NULL,
  role text DEFAULT 'doctor'::text NOT NULL,
  token text DEFAULT encode(gen_random_bytes(32), 'hex'::text) NOT NULL,
  expires_at timestamptz DEFAULT (now() + '7 days'::interval) NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT practice_invitations_pkey PRIMARY KEY (id),
  CONSTRAINT practice_invitations_token_key UNIQUE (token)
);
ALTER TABLE public.practice_invitations ENABLE ROW LEVEL SECURITY;

-- ----- practice_members -----
CREATE TABLE IF NOT EXISTS public.practice_members (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  practice_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  role text DEFAULT 'doctor'::text NOT NULL,
  joined_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT practice_members_pkey PRIMARY KEY (id),
  CONSTRAINT practice_members_practice_id_doctor_id_key UNIQUE (practice_id, doctor_id)
);
ALTER TABLE public.practice_members ENABLE ROW LEVEL SECURITY;

-- ----- practices -----
CREATE TABLE IF NOT EXISTS public.practices (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  address text,
  phone text,
  owner_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT practices_pkey PRIMARY KEY (id)
);
ALTER TABLE public.practices ENABLE ROW LEVEL SECURITY;

-- ----- quarter_admins -----
CREATE TABLE IF NOT EXISTS public.quarter_admins (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  quarter_id uuid NOT NULL,
  user_id uuid NOT NULL,
  assigned_at timestamptz DEFAULT now() NOT NULL,
  assigned_by uuid,
  CONSTRAINT quarter_admins_pkey PRIMARY KEY (id),
  CONSTRAINT quarter_admins_unique UNIQUE (quarter_id, user_id)
);
ALTER TABLE public.quarter_admins ENABLE ROW LEVEL SECURITY;

-- ----- quarters -----
CREATE TABLE IF NOT EXISTS public.quarters (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  center_lat double precision NOT NULL,
  center_lng double precision NOT NULL,
  zoom_level integer DEFAULT 17 NOT NULL,
  bounds_sw_lat double precision NOT NULL,
  bounds_sw_lng double precision NOT NULL,
  bounds_ne_lat double precision NOT NULL,
  bounds_ne_lng double precision NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  city text,
  state text,
  country text DEFAULT 'DE'::text,
  map_config jsonb DEFAULT '{}'::jsonb,
  settings jsonb DEFAULT '{}'::jsonb,
  max_households integer DEFAULT 100,
  status text DEFAULT 'draft'::text NOT NULL,
  invite_prefix text,
  description text,
  contact_email text,
  created_by uuid,
  activated_at timestamptz,
  household_count integer DEFAULT 0,
  weekly_active_pct numeric(5,2) DEFAULT 0,
  geo_boundary geometry,
  geo_center geometry,
  bw_ars text,
  CONSTRAINT quarters_pkey PRIMARY KEY (id),
  CONSTRAINT quarters_invite_prefix_key UNIQUE (invite_prefix),
  CONSTRAINT quarters_slug_key UNIQUE (slug)
);
ALTER TABLE public.quarters ENABLE ROW LEVEL SECURITY;

-- ----- reputation_points -----
CREATE TABLE IF NOT EXISTS public.reputation_points (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  points integer NOT NULL,
  reason text NOT NULL,
  reference_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT reputation_points_pkey PRIMARY KEY (id)
);
ALTER TABLE public.reputation_points ENABLE ROW LEVEL SECURITY;

-- ----- tech_incidents -----
CREATE TABLE IF NOT EXISTS public.tech_incidents (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  severity text NOT NULL,
  status text DEFAULT 'open'::text NOT NULL,
  description text,
  affected_services text[] DEFAULT '{}'::text[],
  resolved_at timestamptz,
  postmortem text,
  admin_id uuid,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT tech_incidents_pkey PRIMARY KEY (id)
);
ALTER TABLE public.tech_incidents ENABLE ROW LEVEL SECURITY;

-- ----- test_results -----
CREATE TABLE IF NOT EXISTS public.test_results (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  session_id uuid NOT NULL,
  test_point_id text NOT NULL,
  status text DEFAULT 'open'::text NOT NULL,
  comment text,
  severity text,
  issue_type text,
  screenshot_url text,
  duration_seconds integer,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT test_results_pkey PRIMARY KEY (id),
  CONSTRAINT test_results_session_id_test_point_id_key UNIQUE (session_id, test_point_id)
);
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- ----- test_sessions -----
CREATE TABLE IF NOT EXISTS public.test_sessions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  started_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz,
  status text DEFAULT 'active'::text NOT NULL,
  app_version text,
  device_type text,
  browser_info text,
  started_from_route text,
  test_run_label text,
  final_feedback text,
  usability_rating smallint,
  confidence_rating smallint,
  summary jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  visited_routes jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT test_sessions_pkey PRIMARY KEY (id)
);
ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;

-- ----- tip_confirmations -----
CREATE TABLE IF NOT EXISTS public.tip_confirmations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tip_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT tip_confirmations_pkey PRIMARY KEY (id),
  CONSTRAINT tip_confirmations_tip_id_user_id_key UNIQUE (tip_id, user_id)
);
ALTER TABLE public.tip_confirmations ENABLE ROW LEVEL SECURITY;

-- ----- vacation_modes -----
CREATE TABLE IF NOT EXISTS public.vacation_modes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  note text,
  notify_neighbors boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  quarter_id uuid,
  CONSTRAINT vacation_modes_pkey PRIMARY KEY (id)
);
ALTER TABLE public.vacation_modes ENABLE ROW LEVEL SECURITY;

-- ----- verification_requests -----
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  household_id uuid NOT NULL,
  method text DEFAULT 'address_manual'::text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  admin_note text,
  created_at timestamptz DEFAULT now() NOT NULL,
  reviewed_at timestamptz,
  reviewed_by uuid,
  CONSTRAINT verification_requests_pkey PRIMARY KEY (id)
);
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- ----- video_credit_usage -----
CREATE TABLE IF NOT EXISTS public.video_credit_usage (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  credit_id uuid NOT NULL,
  appointment_id uuid,
  used_at timestamptz DEFAULT now(),
  CONSTRAINT video_credit_usage_pkey PRIMARY KEY (id)
);
ALTER TABLE public.video_credit_usage ENABLE ROW LEVEL SECURITY;

-- ----- warning_cache -----
CREATE TABLE IF NOT EXISTS public.warning_cache (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  source text NOT NULL,
  external_id text NOT NULL,
  severity text DEFAULT 'unknown'::text NOT NULL,
  title text NOT NULL,
  description text,
  instructions text,
  onset timestamptz,
  expires timestamptz,
  fetched_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT warning_cache_pkey PRIMARY KEY (id)
);
ALTER TABLE public.warning_cache ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- Part 2: helper functions referenced by RLS policies but not present
-- in schema_migrations (manually created in Prod historically)
-- =============================================================

-- is_care_helper_for
CREATE OR REPLACE FUNCTION public.is_care_helper_for(p_senior_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM care_helpers
    WHERE user_id = auth.uid()
    AND p_senior_id = ANY(assigned_seniors)
    AND verification_status = 'verified'
  );
$function$;

-- care_helper_role
CREATE OR REPLACE FUNCTION public.care_helper_role(p_senior_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT role FROM care_helpers
  WHERE user_id = auth.uid()
  AND p_senior_id = ANY(assigned_seniors)
  AND verification_status = 'verified'
  LIMIT 1;
$function$;

-- is_quarter_admin_for
CREATE OR REPLACE FUNCTION public.is_quarter_admin_for(p_quarter_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM quarter_admins WHERE user_id = auth.uid() AND quarter_id = p_quarter_id
    ) OR is_super_admin();
END;
$function$;

-- get_user_quarter_id
CREATE OR REPLACE FUNCTION public.get_user_quarter_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
    RETURN (SELECT h.quarter_id FROM household_members hm
        JOIN households h ON h.id = hm.household_id
        WHERE hm.user_id = auth.uid() LIMIT 1);
END;
$function$;

-- user_civic_org_ids
CREATE OR REPLACE FUNCTION public.user_civic_org_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT org_id FROM civic_members WHERE user_id = auth.uid()
$function$;

-- =============================================================
-- Part 3: RLS policies (idempotent, skips policies re-created by later migrations)
-- =============================================================

-- ----- access_codes -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'access_codes' AND policyname = 'access_codes_creator'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY access_codes_creator ON public.access_codes AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = created_by)) $stmt$;
  END IF;
END $$;

-- ----- admin_audit_log -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'admin_audit_log' AND policyname = 'service_role_only'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY service_role_only ON public.admin_audit_log AS PERMISSIVE FOR ALL TO public USING ((auth.role() = 'service_role'::text)) $stmt$;
  END IF;
END $$;

-- ----- admin_expenses -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'admin_expenses' AND policyname = 'service_role_only'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY service_role_only ON public.admin_expenses AS PERMISSIVE FOR ALL TO public USING ((auth.role() = 'service_role'::text)) $stmt$;
  END IF;
END $$;

-- ----- audit_log -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_log' AND policyname = 'audit_log_doctor_read'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY audit_log_doctor_read ON public.audit_log AS PERMISSIVE FOR SELECT TO public USING ((actor_id = auth.uid())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_log' AND policyname = 'audit_log_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY audit_log_insert ON public.audit_log AS PERMISSIVE FOR INSERT TO public WITH CHECK ((actor_id = auth.uid())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_log' AND policyname = 'audit_log_service_role'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY audit_log_service_role ON public.audit_log AS PERMISSIVE FOR ALL TO public USING ((auth.role() = 'service_role'::text)) $stmt$;
  END IF;
END $$;

-- ----- bug_reports -----
-- skip policy bug_reports_admin_delete (re-created by later migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bug_reports' AND policyname = 'bug_reports_admin_select'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY bug_reports_admin_select ON public.bug_reports AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_admin = true))))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bug_reports' AND policyname = 'bug_reports_admin_update'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY bug_reports_admin_update ON public.bug_reports AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_admin = true))))) $stmt$;
  END IF;
END $$;
-- skip policy bug_reports_insert (re-created by later migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bug_reports' AND policyname = 'bug_reports_select_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY bug_reports_select_own ON public.bug_reports AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id)) $stmt$;
  END IF;
END $$;

-- ----- care_appointments -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_appointments' AND policyname = 'care_appt_delete'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_appt_delete ON public.care_appointments AS PERMISSIVE FOR DELETE TO public USING (((managed_by = auth.uid()) OR (is_care_helper_for(senior_id) AND (care_helper_role(senior_id) = ANY (ARRAY['relative'::text, 'care_service'::text]))) OR is_admin())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_appointments' AND policyname = 'care_appt_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_appt_insert ON public.care_appointments AS PERMISSIVE FOR INSERT TO public WITH CHECK (((senior_id = auth.uid()) OR (is_care_helper_for(senior_id) AND (care_helper_role(senior_id) = ANY (ARRAY['relative'::text, 'care_service'::text]))) OR is_admin())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_appointments' AND policyname = 'care_appt_select_admin'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_appt_select_admin ON public.care_appointments AS PERMISSIVE FOR SELECT TO public USING (is_admin()) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_appointments' AND policyname = 'care_appt_select_helper'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_appt_select_helper ON public.care_appointments AS PERMISSIVE FOR SELECT TO public USING (is_care_helper_for(senior_id)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_appointments' AND policyname = 'care_appt_select_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_appt_select_own ON public.care_appointments AS PERMISSIVE FOR SELECT TO public USING ((senior_id = auth.uid())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_appointments' AND policyname = 'care_appt_select_quarter'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_appt_select_quarter ON public.care_appointments AS PERMISSIVE FOR SELECT TO public USING (((visibility = 'quarter'::text) AND (EXISTS ( SELECT 1
   FROM (household_members hm
     JOIN households h ON ((h.id = hm.household_id)))
  WHERE ((hm.user_id = auth.uid()) AND (h.quarter_id = ( SELECT h2.quarter_id
           FROM (household_members hm2
             JOIN households h2 ON ((h2.id = hm2.household_id)))
          WHERE (hm2.user_id = care_appointments.senior_id)
         LIMIT 1))))))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_appointments' AND policyname = 'care_appt_update'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_appt_update ON public.care_appointments AS PERMISSIVE FOR UPDATE TO public USING (((managed_by = auth.uid()) OR (is_care_helper_for(senior_id) AND (care_helper_role(senior_id) = ANY (ARRAY['relative'::text, 'care_service'::text]))) OR is_admin())) $stmt$;
  END IF;
END $$;

-- ----- care_audit_log -----
-- skip policy care_audit_insert_actor (re-created by later migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_audit_log' AND policyname = 'care_audit_select_admin'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_audit_select_admin ON public.care_audit_log AS PERMISSIVE FOR SELECT TO public USING (is_admin()) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_audit_log' AND policyname = 'care_audit_select_helper'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_audit_select_helper ON public.care_audit_log AS PERMISSIVE FOR SELECT TO public USING (is_care_helper_for(senior_id)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_audit_log' AND policyname = 'care_audit_select_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_audit_select_own ON public.care_audit_log AS PERMISSIVE FOR SELECT TO public USING ((senior_id = auth.uid())) $stmt$;
  END IF;
END $$;

-- ----- care_checkins -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_checkins' AND policyname = 'care_checkins_insert_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_checkins_insert_own ON public.care_checkins AS PERMISSIVE FOR INSERT TO public WITH CHECK ((senior_id = auth.uid())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_checkins' AND policyname = 'care_checkins_select_admin'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_checkins_select_admin ON public.care_checkins AS PERMISSIVE FOR SELECT TO public USING (is_admin()) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_checkins' AND policyname = 'care_checkins_select_helper'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_checkins_select_helper ON public.care_checkins AS PERMISSIVE FOR SELECT TO public USING (is_care_helper_for(senior_id)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_checkins' AND policyname = 'care_checkins_select_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_checkins_select_own ON public.care_checkins AS PERMISSIVE FOR SELECT TO public USING ((senior_id = auth.uid())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_checkins' AND policyname = 'care_checkins_update'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_checkins_update ON public.care_checkins AS PERMISSIVE FOR UPDATE TO public USING (((senior_id = auth.uid()) OR is_admin())) $stmt$;
  END IF;
END $$;

-- ----- care_documents -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_documents' AND policyname = 'care_docs_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_docs_insert ON public.care_documents AS PERMISSIVE FOR INSERT TO public WITH CHECK (((is_care_helper_for(senior_id) AND (care_helper_role(senior_id) = ANY (ARRAY['relative'::text, 'care_service'::text]))) OR is_admin())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_documents' AND policyname = 'care_docs_select_admin'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_docs_select_admin ON public.care_documents AS PERMISSIVE FOR SELECT TO public USING (is_admin()) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_documents' AND policyname = 'care_docs_select_helper'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_docs_select_helper ON public.care_documents AS PERMISSIVE FOR SELECT TO public USING (is_care_helper_for(senior_id)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_documents' AND policyname = 'care_docs_select_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_docs_select_own ON public.care_documents AS PERMISSIVE FOR SELECT TO public USING ((senior_id = auth.uid())) $stmt$;
  END IF;
END $$;

-- ----- care_helpers -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_helpers' AND policyname = 'care_helpers_insert_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_helpers_insert_own ON public.care_helpers AS PERMISSIVE FOR INSERT TO public WITH CHECK ((user_id = auth.uid())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_helpers' AND policyname = 'care_helpers_select'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_helpers_select ON public.care_helpers AS PERMISSIVE FOR SELECT TO public USING (is_verified_member()) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_helpers' AND policyname = 'care_helpers_update_admin'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_helpers_update_admin ON public.care_helpers AS PERMISSIVE FOR UPDATE TO public USING (is_admin()) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_helpers' AND policyname = 'care_helpers_update_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_helpers_update_own ON public.care_helpers AS PERMISSIVE FOR UPDATE TO public USING ((user_id = auth.uid())) $stmt$;
  END IF;
END $$;

-- ----- care_medication_logs -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_medication_logs' AND policyname = 'care_med_logs_insert_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_med_logs_insert_own ON public.care_medication_logs AS PERMISSIVE FOR INSERT TO public WITH CHECK ((senior_id = auth.uid())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_medication_logs' AND policyname = 'care_med_logs_select_admin'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_med_logs_select_admin ON public.care_medication_logs AS PERMISSIVE FOR SELECT TO public USING (is_admin()) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_medication_logs' AND policyname = 'care_med_logs_select_helper'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_med_logs_select_helper ON public.care_medication_logs AS PERMISSIVE FOR SELECT TO public USING (is_care_helper_for(senior_id)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_medication_logs' AND policyname = 'care_med_logs_select_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_med_logs_select_own ON public.care_medication_logs AS PERMISSIVE FOR SELECT TO public USING ((senior_id = auth.uid())) $stmt$;
  END IF;
END $$;

-- ----- care_medications -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_medications' AND policyname = 'care_meds_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_meds_insert ON public.care_medications AS PERMISSIVE FOR INSERT TO public WITH CHECK (((senior_id = auth.uid()) OR (is_care_helper_for(senior_id) AND (care_helper_role(senior_id) = ANY (ARRAY['relative'::text, 'care_service'::text]))) OR is_admin())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_medications' AND policyname = 'care_meds_select_admin'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_meds_select_admin ON public.care_medications AS PERMISSIVE FOR SELECT TO public USING (is_admin()) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_medications' AND policyname = 'care_meds_select_helper'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_meds_select_helper ON public.care_medications AS PERMISSIVE FOR SELECT TO public USING (is_care_helper_for(senior_id)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_medications' AND policyname = 'care_meds_select_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_meds_select_own ON public.care_medications AS PERMISSIVE FOR SELECT TO public USING ((senior_id = auth.uid())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_medications' AND policyname = 'care_meds_update'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_meds_update ON public.care_medications AS PERMISSIVE FOR UPDATE TO public USING (((managed_by = auth.uid()) OR (is_care_helper_for(senior_id) AND (care_helper_role(senior_id) = ANY (ARRAY['relative'::text, 'care_service'::text]))) OR is_admin())) $stmt$;
  END IF;
END $$;

-- ----- care_profiles -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_profiles' AND policyname = 'care_profiles_insert_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_profiles_insert_own ON public.care_profiles AS PERMISSIVE FOR INSERT TO public WITH CHECK ((user_id = auth.uid())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_profiles' AND policyname = 'care_profiles_select_admin'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_profiles_select_admin ON public.care_profiles AS PERMISSIVE FOR SELECT TO public USING (is_admin()) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_profiles' AND policyname = 'care_profiles_select_helper'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_profiles_select_helper ON public.care_profiles AS PERMISSIVE FOR SELECT TO public USING (is_care_helper_for(user_id)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_profiles' AND policyname = 'care_profiles_select_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_profiles_select_own ON public.care_profiles AS PERMISSIVE FOR SELECT TO public USING ((user_id = auth.uid())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_profiles' AND policyname = 'care_profiles_update_admin'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_profiles_update_admin ON public.care_profiles AS PERMISSIVE FOR UPDATE TO public USING (is_admin()) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_profiles' AND policyname = 'care_profiles_update_helper'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_profiles_update_helper ON public.care_profiles AS PERMISSIVE FOR UPDATE TO public USING ((is_care_helper_for(user_id) AND (care_helper_role(user_id) = ANY (ARRAY['relative'::text, 'care_service'::text])))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_profiles' AND policyname = 'care_profiles_update_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_profiles_update_own ON public.care_profiles AS PERMISSIVE FOR UPDATE TO public USING ((user_id = auth.uid())) $stmt$;
  END IF;
END $$;

-- ----- care_profiles_hilfe -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_profiles_hilfe' AND policyname = 'care_profiles_hilfe_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_profiles_hilfe_own ON public.care_profiles_hilfe AS PERMISSIVE FOR ALL TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id)) $stmt$;
  END IF;
END $$;

-- ----- care_shopping_requests -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_shopping_requests' AND policyname = 'shopping_delete'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY shopping_delete ON public.care_shopping_requests AS PERMISSIVE FOR DELETE TO public USING ((((auth.uid() = requester_id) AND (status = 'open'::text)) OR is_admin())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_shopping_requests' AND policyname = 'shopping_insert_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY shopping_insert_own ON public.care_shopping_requests AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = requester_id)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_shopping_requests' AND policyname = 'shopping_select_quarter'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY shopping_select_quarter ON public.care_shopping_requests AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM (household_members hm
     JOIN households h ON ((h.id = hm.household_id)))
  WHERE ((hm.user_id = auth.uid()) AND (h.quarter_id = care_shopping_requests.quarter_id))))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_shopping_requests' AND policyname = 'shopping_update'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY shopping_update ON public.care_shopping_requests AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid() = requester_id) OR (auth.uid() = claimed_by) OR is_admin())) $stmt$;
  END IF;
END $$;

-- ----- care_sos_alerts -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_sos_alerts' AND policyname = 'care_sos_alerts_quarter_delete'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_sos_alerts_quarter_delete ON public.care_sos_alerts AS PERMISSIVE FOR DELETE TO public USING ((is_super_admin() OR is_quarter_admin_for(quarter_id))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_sos_alerts' AND policyname = 'care_sos_alerts_quarter_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_sos_alerts_quarter_insert ON public.care_sos_alerts AS PERMISSIVE FOR INSERT TO public WITH CHECK (((senior_id = auth.uid()) AND ((quarter_id = get_user_quarter_id()) OR is_super_admin()))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_sos_alerts' AND policyname = 'care_sos_alerts_quarter_select'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_sos_alerts_quarter_select ON public.care_sos_alerts AS PERMISSIVE FOR SELECT TO public USING (((senior_id = auth.uid()) OR (is_care_helper_for(senior_id) AND (quarter_id = get_user_quarter_id())) OR is_super_admin() OR is_quarter_admin_for(quarter_id))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_sos_alerts' AND policyname = 'care_sos_alerts_quarter_update'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_sos_alerts_quarter_update ON public.care_sos_alerts AS PERMISSIVE FOR UPDATE TO public USING (((senior_id = auth.uid()) OR (is_care_helper_for(senior_id) AND (quarter_id = get_user_quarter_id())) OR is_super_admin() OR is_quarter_admin_for(quarter_id))) $stmt$;
  END IF;
END $$;

-- ----- care_sos_responses -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_sos_responses' AND policyname = 'care_sos_resp_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_sos_resp_insert ON public.care_sos_responses AS PERMISSIVE FOR INSERT TO public WITH CHECK ((helper_id = auth.uid())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_sos_responses' AND policyname = 'care_sos_resp_select'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_sos_resp_select ON public.care_sos_responses AS PERMISSIVE FOR SELECT TO public USING (((helper_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM care_sos_alerts
  WHERE ((care_sos_alerts.id = care_sos_responses.sos_alert_id) AND ((care_sos_alerts.senior_id = auth.uid()) OR is_care_helper_for(care_sos_alerts.senior_id) OR is_admin())))))) $stmt$;
  END IF;
END $$;

-- ----- care_subscriptions -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_subscriptions' AND policyname = 'care_sub_insert_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_sub_insert_own ON public.care_subscriptions AS PERMISSIVE FOR INSERT TO public WITH CHECK ((user_id = auth.uid())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_subscriptions' AND policyname = 'care_sub_select_admin'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_sub_select_admin ON public.care_subscriptions AS PERMISSIVE FOR SELECT TO public USING (is_admin()) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_subscriptions' AND policyname = 'care_sub_select_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_sub_select_own ON public.care_subscriptions AS PERMISSIVE FOR SELECT TO public USING ((user_id = auth.uid())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_subscriptions' AND policyname = 'care_sub_update_admin'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_sub_update_admin ON public.care_subscriptions AS PERMISSIVE FOR UPDATE TO public USING (is_admin()) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_subscriptions' AND policyname = 'care_sub_update_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY care_sub_update_own ON public.care_subscriptions AS PERMISSIVE FOR UPDATE TO public USING ((user_id = auth.uid())) $stmt$;
  END IF;
END $$;

-- ----- care_tasks -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_tasks' AND policyname = 'tasks_delete'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY tasks_delete ON public.care_tasks AS PERMISSIVE FOR DELETE TO public USING ((((auth.uid() = creator_id) AND (status = 'open'::text)) OR is_admin())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_tasks' AND policyname = 'tasks_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY tasks_insert ON public.care_tasks AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = creator_id)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_tasks' AND policyname = 'tasks_select_quarter'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY tasks_select_quarter ON public.care_tasks AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM (household_members hm
     JOIN households h ON ((h.id = hm.household_id)))
  WHERE ((hm.user_id = auth.uid()) AND (h.quarter_id = care_tasks.quarter_id))))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'care_tasks' AND policyname = 'tasks_update'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY tasks_update ON public.care_tasks AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid() = creator_id) OR (auth.uid() = claimed_by) OR is_admin())) $stmt$;
  END IF;
END $$;

-- ----- citizen_reports -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'citizen_reports' AND policyname = 'citizen_reports_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY citizen_reports_insert ON public.citizen_reports AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'citizen_reports' AND policyname = 'citizen_reports_select'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY citizen_reports_select ON public.citizen_reports AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'citizen_reports' AND policyname = 'citizen_reports_update'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY citizen_reports_update ON public.citizen_reports AS PERMISSIVE FOR UPDATE TO public USING ((org_id IN ( SELECT civic_members.org_id
   FROM civic_members
  WHERE ((civic_members.user_id = auth.uid()) AND (civic_members.role = ANY (ARRAY['civic_admin'::text, 'civic_editor'::text])))))) $stmt$;
  END IF;
END $$;

-- ----- civic_announcements -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'civic_announcements' AND policyname = 'civic_announcements_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY civic_announcements_insert ON public.civic_announcements AS PERMISSIVE FOR INSERT TO public WITH CHECK ((org_id IN ( SELECT civic_members.org_id
   FROM civic_members
  WHERE ((civic_members.user_id = auth.uid()) AND (civic_members.role = ANY (ARRAY['civic_admin'::text, 'civic_editor'::text])))))) $stmt$;
  END IF;
END $$;
-- skip policy civic_announcements_select (re-created by later migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'civic_announcements' AND policyname = 'civic_announcements_update'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY civic_announcements_update ON public.civic_announcements AS PERMISSIVE FOR UPDATE TO public USING ((org_id IN ( SELECT civic_members.org_id
   FROM civic_members
  WHERE ((civic_members.user_id = auth.uid()) AND (civic_members.role = ANY (ARRAY['civic_admin'::text, 'civic_editor'::text])))))) $stmt$;
  END IF;
END $$;

-- ----- civic_appointments -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'civic_appointments' AND policyname = 'civic_appointments_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY civic_appointments_insert ON public.civic_appointments AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'civic_appointments' AND policyname = 'civic_appointments_select'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY civic_appointments_select ON public.civic_appointments AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'civic_appointments' AND policyname = 'civic_appointments_update'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY civic_appointments_update ON public.civic_appointments AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() IS NOT NULL)) $stmt$;
  END IF;
END $$;

-- ----- civic_audit_log -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'civic_audit_log' AND policyname = 'civic_audit_log_select'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY civic_audit_log_select ON public.civic_audit_log AS PERMISSIVE FOR SELECT TO public USING ((org_id IN ( SELECT civic_members.org_id
   FROM civic_members
  WHERE (civic_members.user_id = auth.uid())))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'civic_audit_log' AND policyname = 'civic_audit_log_service_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY civic_audit_log_service_insert ON public.civic_audit_log AS PERMISSIVE FOR INSERT TO public WITH CHECK (true) $stmt$;
  END IF;
END $$;

-- ----- civic_document_requests -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'civic_document_requests' AND policyname = 'civic_document_requests_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY civic_document_requests_insert ON public.civic_document_requests AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'civic_document_requests' AND policyname = 'civic_document_requests_select'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY civic_document_requests_select ON public.civic_document_requests AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'civic_document_requests' AND policyname = 'civic_document_requests_update'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY civic_document_requests_update ON public.civic_document_requests AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() IS NOT NULL)) $stmt$;
  END IF;
END $$;

-- ----- civic_events -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'civic_events' AND policyname = 'civic_events_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY civic_events_insert ON public.civic_events AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'civic_events' AND policyname = 'civic_events_select'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY civic_events_select ON public.civic_events AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL)) $stmt$;
  END IF;
END $$;

-- ----- civic_members -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'civic_members' AND policyname = 'civic_members_select_org'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY civic_members_select_org ON public.civic_members AS PERMISSIVE FOR SELECT TO public USING ((org_id IN ( SELECT user_civic_org_ids() AS user_civic_org_ids))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'civic_members' AND policyname = 'civic_members_select_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY civic_members_select_own ON public.civic_members AS PERMISSIVE FOR SELECT TO public USING ((user_id = auth.uid())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'civic_members' AND policyname = 'civic_members_service_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY civic_members_service_insert ON public.civic_members AS PERMISSIVE FOR INSERT TO public WITH CHECK (true) $stmt$;
  END IF;
END $$;

-- ----- civic_organizations -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'civic_organizations' AND policyname = 'civic_org_select'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY civic_org_select ON public.civic_organizations AS PERMISSIVE FOR SELECT TO public USING ((id IN ( SELECT user_civic_org_ids() AS user_civic_org_ids))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'civic_organizations' AND policyname = 'civic_org_service_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY civic_org_service_insert ON public.civic_organizations AS PERMISSIVE FOR INSERT TO public WITH CHECK (true) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'civic_organizations' AND policyname = 'civic_org_update'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY civic_org_update ON public.civic_organizations AS PERMISSIVE FOR UPDATE TO public USING ((id IN ( SELECT user_civic_org_ids() AS user_civic_org_ids
INTERSECT
 SELECT civic_members.org_id
   FROM civic_members
  WHERE ((civic_members.user_id = auth.uid()) AND (civic_members.role = 'civic_admin'::text))))) $stmt$;
  END IF;
END $$;

-- ----- civic_survey_options -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'civic_survey_options' AND policyname = 'civic_survey_options_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY civic_survey_options_insert ON public.civic_survey_options AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'civic_survey_options' AND policyname = 'civic_survey_options_select'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY civic_survey_options_select ON public.civic_survey_options AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL)) $stmt$;
  END IF;
END $$;

-- ----- civic_survey_votes -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'civic_survey_votes' AND policyname = 'civic_survey_votes_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY civic_survey_votes_insert ON public.civic_survey_votes AS PERMISSIVE FOR INSERT TO public WITH CHECK ((user_id = auth.uid())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'civic_survey_votes' AND policyname = 'civic_survey_votes_select'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY civic_survey_votes_select ON public.civic_survey_votes AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL)) $stmt$;
  END IF;
END $$;

-- ----- civic_surveys -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'civic_surveys' AND policyname = 'civic_surveys_delete'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY civic_surveys_delete ON public.civic_surveys AS PERMISSIVE FOR DELETE TO public USING ((created_by = auth.uid())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'civic_surveys' AND policyname = 'civic_surveys_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY civic_surveys_insert ON public.civic_surveys AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'civic_surveys' AND policyname = 'civic_surveys_select'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY civic_surveys_select ON public.civic_surveys AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL)) $stmt$;
  END IF;
END $$;

-- ----- claude_messages -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'claude_messages' AND policyname = 'claude_messages_anon'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY claude_messages_anon ON public.claude_messages AS PERMISSIVE FOR ALL TO anon USING (true) WITH CHECK (true) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'claude_messages' AND policyname = 'claude_messages_service'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY claude_messages_service ON public.claude_messages AS PERMISSIVE FOR ALL TO service_role USING (true) $stmt$;
  END IF;
END $$;

-- ----- community_tips -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'community_tips' AND policyname = 'tips_delete'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY tips_delete ON public.community_tips AS PERMISSIVE FOR DELETE TO authenticated USING ((auth.uid() = user_id)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'community_tips' AND policyname = 'tips_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY tips_insert ON public.community_tips AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM household_members hm
  WHERE ((hm.user_id = auth.uid()) AND (hm.verified_at IS NOT NULL)))))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'community_tips' AND policyname = 'tips_select'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY tips_select ON public.community_tips AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM household_members hm
  WHERE ((hm.user_id = auth.uid()) AND (hm.verified_at IS NOT NULL))))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'community_tips' AND policyname = 'tips_update'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY tips_update ON public.community_tips AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id)) $stmt$;
  END IF;
END $$;

-- ----- construction_sites -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'construction_sites' AND policyname = 'construction_sites_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY construction_sites_insert ON public.construction_sites AS PERMISSIVE FOR INSERT TO public WITH CHECK ((org_id IN ( SELECT civic_members.org_id
   FROM civic_members
  WHERE ((civic_members.user_id = auth.uid()) AND (civic_members.role = ANY (ARRAY['civic_admin'::text, 'civic_editor'::text])))))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'construction_sites' AND policyname = 'construction_sites_select'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY construction_sites_select ON public.construction_sites AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'construction_sites' AND policyname = 'construction_sites_update'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY construction_sites_update ON public.construction_sites AS PERMISSIVE FOR UPDATE TO public USING ((org_id IN ( SELECT civic_members.org_id
   FROM civic_members
  WHERE ((civic_members.user_id = auth.uid()) AND (civic_members.role = ANY (ARRAY['civic_admin'::text, 'civic_editor'::text])))))) $stmt$;
  END IF;
END $$;

-- ----- consultation_consents -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'consultation_consents' AND policyname = 'consent_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY consent_own ON public.consultation_consents AS PERMISSIVE FOR ALL TO public USING ((user_id = auth.uid())) $stmt$;
  END IF;
END $$;

-- ----- consultation_slots -----
-- skip policy consultation_book_resident_v2 (re-created by later migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'consultation_slots' AND policyname = 'consultation_host_all'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY consultation_host_all ON public.consultation_slots AS PERMISSIVE FOR ALL TO public USING ((host_user_id = auth.uid())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'consultation_slots' AND policyname = 'consultation_select_resident'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY consultation_select_resident ON public.consultation_slots AS PERMISSIVE FOR SELECT TO public USING (((booked_by = auth.uid()) OR (host_user_id = auth.uid()) OR ((status = 'scheduled'::text) AND (booked_by IS NULL) AND (quarter_id IN ( SELECT h.quarter_id
   FROM (household_members hm
     JOIN households h ON ((h.id = hm.household_id)))
  WHERE (hm.user_id = auth.uid())))))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'consultation_slots' AND policyname = 'consultation_slots_doctor_all'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY consultation_slots_doctor_all ON public.consultation_slots AS PERMISSIVE FOR ALL TO public USING ((host_user_id = auth.uid())) $stmt$;
  END IF;
END $$;
-- skip policy patient_insert_consultation_request (re-created by later migration)
-- skip policy patient_update_own_consultations (re-created by later migration)

-- ----- conversations -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'conversations' AND policyname = 'conversations_quarter_delete'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY conversations_quarter_delete ON public.conversations AS PERMISSIVE FOR DELETE TO public USING ((is_super_admin() OR is_quarter_admin_for(quarter_id))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'conversations' AND policyname = 'conversations_quarter_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY conversations_quarter_insert ON public.conversations AS PERMISSIVE FOR INSERT TO public WITH CHECK ((((participant_1 = auth.uid()) OR (participant_2 = auth.uid())) AND ((quarter_id = get_user_quarter_id()) OR is_super_admin() OR is_quarter_admin_for(quarter_id)))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'conversations' AND policyname = 'conversations_quarter_select'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY conversations_quarter_select ON public.conversations AS PERMISSIVE FOR SELECT TO public USING ((((participant_1 = auth.uid()) OR (participant_2 = auth.uid())) AND ((quarter_id = get_user_quarter_id()) OR is_super_admin() OR is_quarter_admin_for(quarter_id)))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'conversations' AND policyname = 'conversations_quarter_update'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY conversations_quarter_update ON public.conversations AS PERMISSIVE FOR UPDATE TO public USING ((((participant_1 = auth.uid()) OR (participant_2 = auth.uid())) AND ((quarter_id = get_user_quarter_id()) OR is_super_admin() OR is_quarter_admin_for(quarter_id)))) $stmt$;
  END IF;
END $$;

-- ----- crisis_alerts -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'crisis_alerts' AND policyname = 'crisis_alerts_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY crisis_alerts_insert ON public.crisis_alerts AS PERMISSIVE FOR INSERT TO public WITH CHECK ((org_id IN ( SELECT civic_members.org_id
   FROM civic_members
  WHERE ((civic_members.user_id = auth.uid()) AND (civic_members.role = 'civic_admin'::text))))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'crisis_alerts' AND policyname = 'crisis_alerts_select'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY crisis_alerts_select ON public.crisis_alerts AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'crisis_alerts' AND policyname = 'crisis_alerts_update'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY crisis_alerts_update ON public.crisis_alerts AS PERMISSIVE FOR UPDATE TO public USING ((org_id IN ( SELECT civic_members.org_id
   FROM civic_members
  WHERE ((civic_members.user_id = auth.uid()) AND (civic_members.role = 'civic_admin'::text))))) $stmt$;
  END IF;
END $$;

-- ----- crisis_templates -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'crisis_templates' AND policyname = 'crisis_templates_select'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY crisis_templates_select ON public.crisis_templates AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL)) $stmt$;
  END IF;
END $$;

-- ----- cron_heartbeats -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'cron_heartbeats' AND policyname = 'admins_can_read_heartbeats'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY admins_can_read_heartbeats ON public.cron_heartbeats AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_admin = true))))) $stmt$;
  END IF;
END $$;

-- ----- cron_job_runs -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'cron_job_runs' AND policyname = 'cron_job_runs_service'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY cron_job_runs_service ON public.cron_job_runs AS PERMISSIVE FOR ALL TO public USING (true) $stmt$;
  END IF;
END $$;

-- ----- device_heartbeats -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'device_heartbeats' AND policyname = 'device_heartbeats_select_admin'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY device_heartbeats_select_admin ON public.device_heartbeats AS PERMISSIVE FOR SELECT TO public USING (is_admin()) $stmt$;
  END IF;
END $$;

-- ----- device_tokens -----
-- skip policy device_tokens_deny_all (re-created by later migration)

-- ----- direct_messages -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'direct_messages' AND policyname = 'dm_create'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY dm_create ON public.direct_messages AS PERMISSIVE FOR INSERT TO public WITH CHECK (((sender_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM conversations c
  WHERE ((c.id = direct_messages.conversation_id) AND ((c.participant_1 = auth.uid()) OR (c.participant_2 = auth.uid()))))))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'direct_messages' AND policyname = 'dm_read'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY dm_read ON public.direct_messages AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM conversations c
  WHERE ((c.id = direct_messages.conversation_id) AND ((c.participant_1 = auth.uid()) OR (c.participant_2 = auth.uid())))))) $stmt$;
  END IF;
END $$;

-- ----- event_participants -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'event_participants' AND policyname = 'ep_manage_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY ep_manage_own ON public.event_participants AS PERMISSIVE FOR ALL TO public USING ((user_id = auth.uid())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'event_participants' AND policyname = 'ep_read'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY ep_read ON public.event_participants AS PERMISSIVE FOR SELECT TO public USING (is_verified_member()) $stmt$;
  END IF;
END $$;

-- ----- events -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'events_quarter_delete'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY events_quarter_delete ON public.events AS PERMISSIVE FOR DELETE TO public USING ((((user_id = auth.uid()) AND (quarter_id = get_user_quarter_id())) OR is_super_admin() OR is_quarter_admin_for(quarter_id))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'events_quarter_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY events_quarter_insert ON public.events AS PERMISSIVE FOR INSERT TO public WITH CHECK (((quarter_id = get_user_quarter_id()) OR is_super_admin() OR is_quarter_admin_for(quarter_id))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'events_quarter_select'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY events_quarter_select ON public.events AS PERMISSIVE FOR SELECT TO public USING (((quarter_id = get_user_quarter_id()) OR is_super_admin() OR is_quarter_admin_for(quarter_id))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'events_quarter_update'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY events_quarter_update ON public.events AS PERMISSIVE FOR UPDATE TO public USING ((((user_id = auth.uid()) AND (quarter_id = get_user_quarter_id())) OR is_super_admin() OR is_quarter_admin_for(quarter_id))) $stmt$;
  END IF;
END $$;

-- ----- expert_endorsements -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'expert_endorsements' AND policyname = 'endorsements_create'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY endorsements_create ON public.expert_endorsements AS PERMISSIVE FOR INSERT TO public WITH CHECK ((is_verified_member() AND (endorser_user_id = auth.uid()) AND (expert_user_id <> auth.uid()))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'expert_endorsements' AND policyname = 'endorsements_delete_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY endorsements_delete_own ON public.expert_endorsements AS PERMISSIVE FOR DELETE TO public USING ((endorser_user_id = auth.uid())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'expert_endorsements' AND policyname = 'endorsements_read'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY endorsements_read ON public.expert_endorsements AS PERMISSIVE FOR SELECT TO public USING (is_verified_member()) $stmt$;
  END IF;
END $$;

-- ----- expert_reviews -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'expert_reviews' AND policyname = 'reviews_create'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY reviews_create ON public.expert_reviews AS PERMISSIVE FOR INSERT TO public WITH CHECK ((is_verified_member() AND (reviewer_user_id = auth.uid()) AND (expert_user_id <> auth.uid()))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'expert_reviews' AND policyname = 'reviews_delete_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY reviews_delete_own ON public.expert_reviews AS PERMISSIVE FOR DELETE TO public USING ((reviewer_user_id = auth.uid())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'expert_reviews' AND policyname = 'reviews_read'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY reviews_read ON public.expert_reviews AS PERMISSIVE FOR SELECT TO public USING (is_verified_member()) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'expert_reviews' AND policyname = 'reviews_update_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY reviews_update_own ON public.expert_reviews AS PERMISSIVE FOR UPDATE TO public USING ((reviewer_user_id = auth.uid())) $stmt$;
  END IF;
END $$;

-- ----- federal_state_rules -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'federal_state_rules' AND policyname = 'federal_state_rules_select'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY federal_state_rules_select ON public.federal_state_rules AS PERMISSIVE FOR SELECT TO authenticated USING (true) $stmt$;
  END IF;
END $$;

-- ----- help_matches -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'help_matches' AND policyname = 'matches_parties'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY matches_parties ON public.help_matches AS PERMISSIVE FOR ALL TO authenticated USING (((helper_id IN ( SELECT neighborhood_helpers.id
   FROM neighborhood_helpers
  WHERE (neighborhood_helpers.user_id = auth.uid()))) OR (request_id IN ( SELECT help_requests.id
   FROM help_requests
  WHERE (help_requests.user_id = auth.uid()))))) $stmt$;
  END IF;
END $$;

-- ----- help_monthly_reports -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'help_monthly_reports' AND policyname = 'reports_helper'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY reports_helper ON public.help_monthly_reports AS PERMISSIVE FOR ALL TO authenticated USING ((helper_id IN ( SELECT neighborhood_helpers.id
   FROM neighborhood_helpers
  WHERE (neighborhood_helpers.user_id = auth.uid())))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'help_monthly_reports' AND policyname = 'reports_resident'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY reports_resident ON public.help_monthly_reports AS PERMISSIVE FOR ALL TO authenticated USING ((resident_id = auth.uid())) $stmt$;
  END IF;
END $$;

-- ----- help_receipts -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'help_receipts' AND policyname = 'receipts_parties'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY receipts_parties ON public.help_receipts AS PERMISSIVE FOR ALL TO authenticated USING ((session_id IN ( SELECT hs.id
   FROM ((help_sessions hs
     JOIN help_matches hm ON ((hs.match_id = hm.id)))
     JOIN neighborhood_helpers nh ON ((hm.helper_id = nh.id)))
  WHERE (nh.user_id = auth.uid())
UNION
 SELECT hs.id
   FROM ((help_sessions hs
     JOIN help_matches hm ON ((hs.match_id = hm.id)))
     JOIN help_requests hr ON ((hm.request_id = hr.id)))
  WHERE (hr.user_id = auth.uid())))) $stmt$;
  END IF;
END $$;

-- ----- help_responses -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'help_responses' AND policyname = 'help_responses_create'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY help_responses_create ON public.help_responses AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = responder_user_id) AND (EXISTS ( SELECT 1
   FROM household_members hm
  WHERE (hm.user_id = auth.uid()))))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'help_responses' AND policyname = 'help_responses_delete_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY help_responses_delete_own ON public.help_responses AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = responder_user_id)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'help_responses' AND policyname = 'help_responses_read'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY help_responses_read ON public.help_responses AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM household_members hm
  WHERE (hm.user_id = auth.uid())))) $stmt$;
  END IF;
END $$;

-- ----- help_sessions -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'help_sessions' AND policyname = 'sessions_parties'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY sessions_parties ON public.help_sessions AS PERMISSIVE FOR ALL TO authenticated USING ((match_id IN ( SELECT hm.id
   FROM (help_matches hm
     JOIN neighborhood_helpers nh ON ((hm.helper_id = nh.id)))
  WHERE (nh.user_id = auth.uid())
UNION
 SELECT hm.id
   FROM (help_matches hm
     JOIN help_requests hr ON ((hm.request_id = hr.id)))
  WHERE (hr.user_id = auth.uid())))) $stmt$;
  END IF;
END $$;

-- ----- helper_connections -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'helper_connections' AND policyname = 'connections_helper'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY connections_helper ON public.helper_connections AS PERMISSIVE FOR ALL TO authenticated USING ((helper_id IN ( SELECT neighborhood_helpers.id
   FROM neighborhood_helpers
  WHERE (neighborhood_helpers.user_id = auth.uid())))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'helper_connections' AND policyname = 'connections_resident'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY connections_resident ON public.helper_connections AS PERMISSIVE FOR ALL TO authenticated USING ((resident_id = auth.uid())) $stmt$;
  END IF;
END $$;

-- ----- invite_codes -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'invite_codes' AND policyname = 'Users can create invite codes'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY "Users can create invite codes" ON public.invite_codes AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = created_by)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'invite_codes' AND policyname = 'Users can update own unused codes'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY "Users can update own unused codes" ON public.invite_codes AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = created_by)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'invite_codes' AND policyname = 'Users can view own invite codes'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY "Users can view own invite codes" ON public.invite_codes AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = created_by)) $stmt$;
  END IF;
END $$;

-- ----- invoices -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'invoices' AND policyname = 'admin_insert_invoices'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY admin_insert_invoices ON public.invoices AS PERMISSIVE FOR INSERT TO public WITH CHECK (true) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'invoices' AND policyname = 'admin_read_invoices'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY admin_read_invoices ON public.invoices AS PERMISSIVE FOR SELECT TO public USING (true) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'invoices' AND policyname = 'admin_update_invoices'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY admin_update_invoices ON public.invoices AS PERMISSIVE FOR UPDATE TO public USING (true) $stmt$;
  END IF;
END $$;

-- ----- kiosk_photos -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'kiosk_photos' AND policyname = 'kiosk_photos_delete'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY kiosk_photos_delete ON public.kiosk_photos AS PERMISSIVE FOR DELETE TO public USING ((uploaded_by = auth.uid())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'kiosk_photos' AND policyname = 'kiosk_photos_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY kiosk_photos_insert ON public.kiosk_photos AS PERMISSIVE FOR INSERT TO public WITH CHECK (((uploaded_by = auth.uid()) AND (household_id IN ( SELECT h.id
   FROM ((households h
     JOIN household_members hm ON ((hm.household_id = h.id)))
     JOIN caregiver_links cl ON ((cl.resident_id = hm.user_id)))
  WHERE ((cl.caregiver_id = auth.uid()) AND (cl.revoked_at IS NULL)))))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'kiosk_photos' AND policyname = 'kiosk_photos_select'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY kiosk_photos_select ON public.kiosk_photos AS PERMISSIVE FOR SELECT TO public USING (((household_id IN ( SELECT h.id
   FROM ((households h
     JOIN household_members hm ON ((hm.household_id = h.id)))
     JOIN caregiver_links cl ON ((cl.resident_id = hm.user_id)))
  WHERE ((cl.caregiver_id = auth.uid()) AND (cl.revoked_at IS NULL)))) OR (uploaded_by = auth.uid()))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'kiosk_photos' AND policyname = 'kiosk_photos_update'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY kiosk_photos_update ON public.kiosk_photos AS PERMISSIVE FOR UPDATE TO public USING ((uploaded_by = auth.uid())) $stmt$;
  END IF;
END $$;

-- ----- kiosk_reminders -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'kiosk_reminders' AND policyname = 'kiosk_reminders_delete'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY kiosk_reminders_delete ON public.kiosk_reminders AS PERMISSIVE FOR DELETE TO public USING ((created_by = auth.uid())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'kiosk_reminders' AND policyname = 'kiosk_reminders_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY kiosk_reminders_insert ON public.kiosk_reminders AS PERMISSIVE FOR INSERT TO public WITH CHECK (((created_by = auth.uid()) AND (household_id IN ( SELECT h.id
   FROM ((households h
     JOIN household_members hm ON ((hm.household_id = h.id)))
     JOIN caregiver_links cl ON ((cl.resident_id = hm.user_id)))
  WHERE ((cl.caregiver_id = auth.uid()) AND (cl.revoked_at IS NULL)))))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'kiosk_reminders' AND policyname = 'kiosk_reminders_select'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY kiosk_reminders_select ON public.kiosk_reminders AS PERMISSIVE FOR SELECT TO public USING (((household_id IN ( SELECT h.id
   FROM ((households h
     JOIN household_members hm ON ((hm.household_id = h.id)))
     JOIN caregiver_links cl ON ((cl.resident_id = hm.user_id)))
  WHERE ((cl.caregiver_id = auth.uid()) AND (cl.revoked_at IS NULL)))) OR (created_by = auth.uid()))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'kiosk_reminders' AND policyname = 'kiosk_reminders_update'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY kiosk_reminders_update ON public.kiosk_reminders AS PERMISSIVE FOR UPDATE TO public USING ((created_by = auth.uid())) $stmt$;
  END IF;
END $$;

-- ----- leihboerse_items -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'leihboerse_items' AND policyname = 'leihboerse_create'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY leihboerse_create ON public.leihboerse_items AS PERMISSIVE FOR INSERT TO public WITH CHECK ((is_verified_member() AND (user_id = auth.uid()))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'leihboerse_items' AND policyname = 'leihboerse_delete'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY leihboerse_delete ON public.leihboerse_items AS PERMISSIVE FOR DELETE TO public USING ((is_verified_member() AND (user_id = auth.uid()))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'leihboerse_items' AND policyname = 'leihboerse_read'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY leihboerse_read ON public.leihboerse_items AS PERMISSIVE FOR SELECT TO public USING (is_verified_member()) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'leihboerse_items' AND policyname = 'leihboerse_update'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY leihboerse_update ON public.leihboerse_items AS PERMISSIVE FOR UPDATE TO public USING ((is_verified_member() AND (user_id = auth.uid()))) $stmt$;
  END IF;
END $$;

-- ----- map_houses -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'map_houses' AND policyname = 'map_houses_admin_delete'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY map_houses_admin_delete ON public.map_houses AS PERMISSIVE FOR DELETE TO public USING (is_admin()) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'map_houses' AND policyname = 'map_houses_admin_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY map_houses_admin_insert ON public.map_houses AS PERMISSIVE FOR INSERT TO public WITH CHECK (is_admin()) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'map_houses' AND policyname = 'map_houses_admin_update'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY map_houses_admin_update ON public.map_houses AS PERMISSIVE FOR UPDATE TO public USING (is_admin()) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'map_houses' AND policyname = 'map_houses_own_position'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY map_houses_own_position ON public.map_houses AS PERMISSIVE FOR UPDATE TO public USING ((is_verified_member() AND (EXISTS ( SELECT 1
   FROM (household_members hm
     JOIN households h ON ((h.id = hm.household_id)))
  WHERE ((hm.user_id = auth.uid()) AND (hm.verified_at IS NOT NULL) AND (h.street_name =
        CASE map_houses.street_code
            WHEN 'PS'::text THEN 'Purkersdorfer Straße'::text
            WHEN 'SN'::text THEN 'Sanarystraße'::text
            WHEN 'OR'::text THEN 'Oberer Rebberg'::text
            ELSE NULL::text
        END) AND (h.house_number = map_houses.house_number)))))) WITH CHECK ((is_verified_member() AND (EXISTS ( SELECT 1
   FROM (household_members hm
     JOIN households h ON ((h.id = hm.household_id)))
  WHERE ((hm.user_id = auth.uid()) AND (hm.verified_at IS NOT NULL) AND (h.street_name =
        CASE map_houses.street_code
            WHEN 'PS'::text THEN 'Purkersdorfer Straße'::text
            WHEN 'SN'::text THEN 'Sanarystraße'::text
            WHEN 'OR'::text THEN 'Oberer Rebberg'::text
            ELSE NULL::text
        END) AND (h.house_number = map_houses.house_number)))))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'map_houses' AND policyname = 'map_houses_read'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY map_houses_read ON public.map_houses AS PERMISSIVE FOR SELECT TO public USING (is_verified_member()) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'map_houses' AND policyname = 'map_houses_user_upsert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY map_houses_user_upsert ON public.map_houses AS PERMISSIVE FOR ALL TO public USING ((household_id IN ( SELECT household_members.household_id
   FROM household_members
  WHERE ((household_members.user_id = auth.uid()) AND (household_members.verified_at IS NOT NULL))))) $stmt$;
  END IF;
END $$;

-- ----- neighbor_connections -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'neighbor_connections' AND policyname = 'nc_create'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY nc_create ON public.neighbor_connections AS PERMISSIVE FOR INSERT TO public WITH CHECK ((is_verified_member() AND (requester_id = auth.uid()))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'neighbor_connections' AND policyname = 'nc_delete'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY nc_delete ON public.neighbor_connections AS PERMISSIVE FOR DELETE TO public USING ((is_verified_member() AND ((requester_id = auth.uid()) OR (target_id = auth.uid())))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'neighbor_connections' AND policyname = 'nc_read'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY nc_read ON public.neighbor_connections AS PERMISSIVE FOR SELECT TO public USING ((is_verified_member() AND ((requester_id = auth.uid()) OR (target_id = auth.uid())))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'neighbor_connections' AND policyname = 'nc_update'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY nc_update ON public.neighbor_connections AS PERMISSIVE FOR UPDATE TO public USING ((is_verified_member() AND (target_id = auth.uid()))) $stmt$;
  END IF;
END $$;

-- ----- neighbor_invitations -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'neighbor_invitations' AND policyname = 'neighbor_invitations_admin_read'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY neighbor_invitations_admin_read ON public.neighbor_invitations AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_admin = true))))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'neighbor_invitations' AND policyname = 'neighbor_invitations_own_read'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY neighbor_invitations_own_read ON public.neighbor_invitations AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = inviter_id)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'neighbor_invitations' AND policyname = 'neighbor_invitations_update'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY neighbor_invitations_update ON public.neighbor_invitations AS PERMISSIVE FOR UPDATE TO public USING (true) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'neighbor_invitations' AND policyname = 'neighbor_invitations_verified_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY neighbor_invitations_verified_insert ON public.neighbor_invitations AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = inviter_id) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.trust_level = ANY (ARRAY['verified'::text, 'trusted'::text, 'admin'::text]))))))) $stmt$;
  END IF;
END $$;

-- ----- neighborhood_helpers -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'neighborhood_helpers' AND policyname = 'helpers_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY helpers_own ON public.neighborhood_helpers AS PERMISSIVE FOR ALL TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'neighborhood_helpers' AND policyname = 'helpers_quarter_read'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY helpers_quarter_read ON public.neighborhood_helpers AS PERMISSIVE FOR SELECT TO authenticated USING ((verified = true)) $stmt$;
  END IF;
END $$;

-- ----- onboarding_steps -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'onboarding_steps' AND policyname = 'admin_onboarding_steps'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY admin_onboarding_steps ON public.onboarding_steps AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'super_admin'::text))))) $stmt$;
  END IF;
END $$;

-- ----- paketannahme -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'paketannahme' AND policyname = 'paketannahme_create'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY paketannahme_create ON public.paketannahme AS PERMISSIVE FOR INSERT TO public WITH CHECK ((is_verified_member() AND (user_id = auth.uid()))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'paketannahme' AND policyname = 'paketannahme_delete'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY paketannahme_delete ON public.paketannahme AS PERMISSIVE FOR DELETE TO public USING ((is_verified_member() AND (user_id = auth.uid()))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'paketannahme' AND policyname = 'paketannahme_read'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY paketannahme_read ON public.paketannahme AS PERMISSIVE FOR SELECT TO public USING (is_verified_member()) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'paketannahme' AND policyname = 'paketannahme_update'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY paketannahme_update ON public.paketannahme AS PERMISSIVE FOR UPDATE TO public USING ((is_verified_member() AND (user_id = auth.uid()))) $stmt$;
  END IF;
END $$;

-- ----- poll_options -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'poll_options' AND policyname = 'poll_options_create'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY poll_options_create ON public.poll_options AS PERMISSIVE FOR INSERT TO public WITH CHECK ((is_verified_member() AND (EXISTS ( SELECT 1
   FROM polls
  WHERE ((polls.id = poll_options.poll_id) AND (polls.user_id = auth.uid())))))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'poll_options' AND policyname = 'poll_options_read'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY poll_options_read ON public.poll_options AS PERMISSIVE FOR SELECT TO public USING (is_verified_member()) $stmt$;
  END IF;
END $$;

-- ----- poll_votes -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'poll_votes' AND policyname = 'poll_votes_create'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY poll_votes_create ON public.poll_votes AS PERMISSIVE FOR INSERT TO public WITH CHECK ((is_verified_member() AND (user_id = auth.uid()))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'poll_votes' AND policyname = 'poll_votes_delete'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY poll_votes_delete ON public.poll_votes AS PERMISSIVE FOR DELETE TO public USING ((is_verified_member() AND (user_id = auth.uid()))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'poll_votes' AND policyname = 'poll_votes_read'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY poll_votes_read ON public.poll_votes AS PERMISSIVE FOR SELECT TO public USING (is_verified_member()) $stmt$;
  END IF;
END $$;

-- ----- polls -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'polls' AND policyname = 'polls_create'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY polls_create ON public.polls AS PERMISSIVE FOR INSERT TO public WITH CHECK ((is_verified_member() AND (user_id = auth.uid()))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'polls' AND policyname = 'polls_delete'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY polls_delete ON public.polls AS PERMISSIVE FOR DELETE TO public USING ((is_verified_member() AND (user_id = auth.uid()))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'polls' AND policyname = 'polls_read'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY polls_read ON public.polls AS PERMISSIVE FOR SELECT TO public USING (is_verified_member()) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'polls' AND policyname = 'polls_update'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY polls_update ON public.polls AS PERMISSIVE FOR UPDATE TO public USING ((is_verified_member() AND (user_id = auth.uid()))) $stmt$;
  END IF;
END $$;

-- ----- practice_announcements -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'practice_announcements' AND policyname = 'announcements_doctor_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY announcements_doctor_own ON public.practice_announcements AS PERMISSIVE FOR ALL TO public USING ((doctor_id = auth.uid())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'practice_announcements' AND policyname = 'announcements_public_read'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY announcements_public_read ON public.practice_announcements AS PERMISSIVE FOR SELECT TO public USING (((status = 'published'::text) AND ((expires_at IS NULL) OR (expires_at > now())))) $stmt$;
  END IF;
END $$;

-- ----- practice_invitations -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'practice_invitations' AND policyname = 'invitations_owner_all'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY invitations_owner_all ON public.practice_invitations AS PERMISSIVE FOR ALL TO public USING ((practice_id IN ( SELECT practices.id
   FROM practices
  WHERE (practices.owner_id = auth.uid())))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'practice_invitations' AND policyname = 'invitations_public_read_by_token'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY invitations_public_read_by_token ON public.practice_invitations AS PERMISSIVE FOR SELECT TO public USING (((accepted_at IS NULL) AND (expires_at > now()))) $stmt$;
  END IF;
END $$;

-- ----- practice_members -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'practice_members' AND policyname = 'members_owner_all'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY members_owner_all ON public.practice_members AS PERMISSIVE FOR ALL TO public USING ((practice_id IN ( SELECT practices.id
   FROM practices
  WHERE (practices.owner_id = auth.uid())))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'practice_members' AND policyname = 'members_self_read'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY members_self_read ON public.practice_members AS PERMISSIVE FOR SELECT TO public USING ((practice_id IN ( SELECT pm.practice_id
   FROM practice_members pm
  WHERE (pm.doctor_id = auth.uid())))) $stmt$;
  END IF;
END $$;

-- ----- practices -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'practices' AND policyname = 'practices_member_read'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY practices_member_read ON public.practices AS PERMISSIVE FOR SELECT TO public USING ((id IN ( SELECT practice_members.practice_id
   FROM practice_members
  WHERE (practice_members.doctor_id = auth.uid())))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'practices' AND policyname = 'practices_owner_all'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY practices_owner_all ON public.practices AS PERMISSIVE FOR ALL TO public USING ((owner_id = auth.uid())) $stmt$;
  END IF;
END $$;

-- ----- quarter_admins -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'quarter_admins' AND policyname = 'quarter_admins_read_own'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY quarter_admins_read_own ON public.quarter_admins AS PERMISSIVE FOR SELECT TO public USING ((user_id = auth.uid())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'quarter_admins' AND policyname = 'quarter_admins_super_admin'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY quarter_admins_super_admin ON public.quarter_admins AS PERMISSIVE FOR ALL TO public USING (is_super_admin()) $stmt$;
  END IF;
END $$;

-- ----- quarters -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'quarters' AND policyname = 'quarters_admin_manage'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY quarters_admin_manage ON public.quarters AS PERMISSIVE FOR ALL TO public USING ((is_super_admin() OR is_quarter_admin_for(id))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'quarters' AND policyname = 'quarters_select_active'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY quarters_select_active ON public.quarters AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() IS NOT NULL) AND ((status = 'active'::text) OR is_super_admin() OR is_quarter_admin_for(id)))) $stmt$;
  END IF;
END $$;

-- ----- reputation_points -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reputation_points' AND policyname = 'reputation_points_admin_read'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY reputation_points_admin_read ON public.reputation_points AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_admin = true))))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reputation_points' AND policyname = 'reputation_points_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY reputation_points_insert ON public.reputation_points AS PERMISSIVE FOR INSERT TO public WITH CHECK (true) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reputation_points' AND policyname = 'reputation_points_own_read'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY reputation_points_own_read ON public.reputation_points AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id)) $stmt$;
  END IF;
END $$;

-- ----- tech_incidents -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tech_incidents' AND policyname = 'service_role_only'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY service_role_only ON public.tech_incidents AS PERMISSIVE FOR ALL TO public USING ((auth.role() = 'service_role'::text)) $stmt$;
  END IF;
END $$;

-- ----- test_results -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'test_results' AND policyname = 'admin_select_all_results'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY admin_select_all_results ON public.test_results AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_admin = true))))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'test_results' AND policyname = 'tester_insert_own_results'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY tester_insert_own_results ON public.test_results AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM test_sessions
  WHERE ((test_sessions.id = test_results.session_id) AND (test_sessions.user_id = auth.uid()))))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'test_results' AND policyname = 'tester_select_own_results'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY tester_select_own_results ON public.test_results AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM test_sessions
  WHERE ((test_sessions.id = test_results.session_id) AND (test_sessions.user_id = auth.uid()))))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'test_results' AND policyname = 'tester_update_own_results'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY tester_update_own_results ON public.test_results AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM test_sessions
  WHERE ((test_sessions.id = test_results.session_id) AND (test_sessions.user_id = auth.uid()))))) $stmt$;
  END IF;
END $$;

-- ----- test_sessions -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'test_sessions' AND policyname = 'admin_select_all_sessions'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY admin_select_all_sessions ON public.test_sessions AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_admin = true))))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'test_sessions' AND policyname = 'tester_insert_own_sessions'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY tester_insert_own_sessions ON public.test_sessions AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'test_sessions' AND policyname = 'tester_select_own_sessions'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY tester_select_own_sessions ON public.test_sessions AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'test_sessions' AND policyname = 'tester_update_own_sessions'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY tester_update_own_sessions ON public.test_sessions AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id)) $stmt$;
  END IF;
END $$;

-- ----- tip_confirmations -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tip_confirmations' AND policyname = 'confirmations_delete'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY confirmations_delete ON public.tip_confirmations AS PERMISSIVE FOR DELETE TO authenticated USING ((auth.uid() = user_id)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tip_confirmations' AND policyname = 'confirmations_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY confirmations_insert ON public.tip_confirmations AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM household_members hm
  WHERE ((hm.user_id = auth.uid()) AND (hm.verified_at IS NOT NULL)))))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tip_confirmations' AND policyname = 'confirmations_select'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY confirmations_select ON public.tip_confirmations AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM household_members hm
  WHERE ((hm.user_id = auth.uid()) AND (hm.verified_at IS NOT NULL))))) $stmt$;
  END IF;
END $$;

-- ----- vacation_modes -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'vacation_modes' AND policyname = 'vacation_create'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY vacation_create ON public.vacation_modes AS PERMISSIVE FOR INSERT TO public WITH CHECK ((is_verified_member() AND (user_id = auth.uid()))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'vacation_modes' AND policyname = 'vacation_delete'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY vacation_delete ON public.vacation_modes AS PERMISSIVE FOR DELETE TO public USING ((user_id = auth.uid())) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'vacation_modes' AND policyname = 'vacation_read'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY vacation_read ON public.vacation_modes AS PERMISSIVE FOR SELECT TO public USING (is_verified_member()) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'vacation_modes' AND policyname = 'vacation_update'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY vacation_update ON public.vacation_modes AS PERMISSIVE FOR UPDATE TO public USING ((user_id = auth.uid())) $stmt$;
  END IF;
END $$;

-- ----- verification_requests -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'verification_requests' AND policyname = 'verification_requests_admin_read'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY verification_requests_admin_read ON public.verification_requests AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_admin = true))))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'verification_requests' AND policyname = 'verification_requests_admin_update'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY verification_requests_admin_update ON public.verification_requests AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_admin = true))))) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'verification_requests' AND policyname = 'verification_requests_own_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY verification_requests_own_insert ON public.verification_requests AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id)) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'verification_requests' AND policyname = 'verification_requests_own_read'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY verification_requests_own_read ON public.verification_requests AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id)) $stmt$;
  END IF;
END $$;

-- ----- video_credit_usage -----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'video_credit_usage' AND policyname = 'video_credit_usage_owner_select'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY video_credit_usage_owner_select ON public.video_credit_usage AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM video_credits vc
  WHERE ((vc.id = video_credit_usage.credit_id) AND (vc.doctor_id = auth.uid()))))) $stmt$;
  END IF;
END $$;

-- ----- warning_cache -----
-- skip policy warning_cache_select (re-created by later migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'warning_cache' AND policyname = 'warning_cache_service_delete'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY warning_cache_service_delete ON public.warning_cache AS PERMISSIVE FOR DELETE TO public USING (true) $stmt$;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'warning_cache' AND policyname = 'warning_cache_service_insert'
  ) THEN
    EXECUTE $stmt$ CREATE POLICY warning_cache_service_insert ON public.warning_cache AS PERMISSIVE FOR INSERT TO public WITH CHECK (true) $stmt$;
  END IF;
END $$;

COMMIT;
