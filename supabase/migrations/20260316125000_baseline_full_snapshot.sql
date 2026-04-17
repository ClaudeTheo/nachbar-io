-- Baseline snapshot: 83 prod-only tables (Version 20260316125000)
-- Purpose: unlock Supabase branch replay by providing CREATE TABLE + RLS for 83
-- Prod tables that have no CREATE TABLE entry in schema_migrations.
--
-- Deliberately MINIMAL:
--   - CREATE TABLE IF NOT EXISTS, inline PK + UNIQUE only
--   - FK, CHECK, indexes, policies, helper functions: NOT included
--   - The one exception is CREATE EXTENSION postgis, because quarters has
--     geometry-typed columns in Prod and postgis is only enabled in a later
--     migration (20260317084431).
--
-- Rationale: branch replay only needs tables to EXIST so later migrations can
-- ALTER/reference them. Policies, FKs, and indexes are created by later migrations
-- or exist in Prod-only state. Attempting to recreate them here risks dependency
-- issues (e.g. helper functions reference pre-window columns that 001_initial_schema
-- does not contain because they were added in migrations that were squashed).
--
-- Ur-Spalten = Prod columns MINUS columns added later via ALTER TABLE ADD COLUMN
-- in schema_migrations (so later migrations run cleanly without column-already-exists).

BEGIN;

-- PostGIS: quarters has geo_boundary/geo_center of type geometry in Prod;
-- migration 20260317084431 enables postgis but would run AFTER our CREATE TABLE.
CREATE EXTENSION IF NOT EXISTS postgis;

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

COMMIT;
