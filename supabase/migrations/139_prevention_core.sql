-- Migration 139: Praevention Kern-Tabellen
-- Design-Ref: docs/plans/2026-04-05-praevention-aktiv-im-quartier-design.md (B4)

-- Krankenkassen-Konfiguration (modular)
CREATE TABLE insurance_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  logo_url TEXT,
  submission_type TEXT NOT NULL CHECK (submission_type IN ('app_link', 'web_upload', 'email', 'postal')),
  submission_url TEXT,
  submission_email TEXT,
  instructions TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Kurs-Definition
CREATE TABLE prevention_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  instructor_id UUID NOT NULL REFERENCES public.users(id),
  quarter_id UUID REFERENCES quarters(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  max_participants INTEGER DEFAULT 15,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Kurs-Einschreibung (Zahler != Teilnehmer)
CREATE TABLE prevention_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES prevention_courses(id),
  user_id UUID NOT NULL REFERENCES public.users(id),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  certificate_generated BOOLEAN DEFAULT false,
  certificate_id TEXT,
  certificate_issued_by UUID REFERENCES public.users(id),
  certificate_issued_at TIMESTAMPTZ,
  attendance_rate NUMERIC(5,2),
  pre_pss10_score INTEGER,
  pre_pss10_completed_at TIMESTAMPTZ,
  post_pss10_score INTEGER,
  post_pss10_completed_at TIMESTAMPTZ,
  pss10_version TEXT DEFAULT '10-item-cohen-1983',
  payer_user_id UUID REFERENCES public.users(id),
  payer_type TEXT CHECK (payer_type IN ('self', 'caregiver', 'organization', 'pilot_free')) DEFAULT 'self',
  payer_name TEXT,
  payer_email TEXT,
  insurance_provider TEXT,
  insurance_config_id UUID REFERENCES insurance_configs(id),
  reimbursement_started_at TIMESTAMPTZ,
  reimbursement_submitted_at TIMESTAMPTZ,
  reimbursement_method TEXT CHECK (reimbursement_method IN ('app_upload', 'web_upload', 'email', 'postal', 'relative_assisted')),
  reimbursement_confirmed_at TIMESTAMPTZ,
  reimbursement_reminder_enabled BOOLEAN DEFAULT false,
  UNIQUE(course_id, user_id)
);

-- Sitzungs-Tracking
CREATE TABLE prevention_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES prevention_enrollments(id),
  week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 8),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 1 AND 7),
  session_type TEXT NOT NULL CHECK (session_type IN ('daily_mini', 'weekly_main')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  instructor_present BOOLEAN DEFAULT false,
  instructor_duration_seconds INTEGER,
  attendance_verified BOOLEAN DEFAULT false,
  mood_before INTEGER CHECK (mood_before BETWEEN 1 AND 3),
  mood_after INTEGER CHECK (mood_after BETWEEN 1 AND 3),
  notes_encrypted TEXT,
  voice_consent_given BOOLEAN DEFAULT false,
  escalation_flag TEXT DEFAULT 'normal'
    CHECK (escalation_flag IN ('normal', 'abbruch_freiwillig', 'belastung_erkannt', 'abgebrochen_eskalation'))
);

-- Wochen-Inhalte (versioniert)
CREATE TABLE prevention_course_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES prevention_courses(id),
  week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 8),
  title TEXT NOT NULL,
  description TEXT,
  methods TEXT[],
  materials_url TEXT,
  ki_system_prompt TEXT,
  prompt_version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.users(id),
  UNIQUE(course_id, week_number)
);

-- Video-Gruppen-Calls
CREATE TABLE prevention_group_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES prevention_courses(id),
  week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 8),
  scheduled_at TIMESTAMPTZ NOT NULL,
  meeting_url TEXT,
  instructor_id UUID NOT NULL REFERENCES public.users(id),
  duration_minutes INTEGER DEFAULT 60,
  recording_consent BOOLEAN DEFAULT false
);

-- Nachrichten (Kursleiter -> Teilnehmer)
CREATE TABLE prevention_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES prevention_courses(id),
  sender_id UUID NOT NULL REFERENCES public.users(id),
  recipient_id UUID REFERENCES public.users(id),
  message_type TEXT NOT NULL CHECK (message_type IN ('broadcast', 'individual', 'system_reminder')),
  subject TEXT,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sichtbarkeits-Einwilligung
CREATE TABLE prevention_visibility_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES prevention_enrollments(id),
  user_id UUID NOT NULL REFERENCES public.users(id),
  viewer_type TEXT NOT NULL CHECK (viewer_type IN ('caregiver', 'org_member')),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  UNIQUE(enrollment_id, viewer_type)
);

-- Zahlungen
CREATE TABLE prevention_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES prevention_enrollments(id),
  stripe_payment_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'eur',
  payment_type TEXT NOT NULL CHECK (payment_type IN ('self_pay', 'insurance_advance', 'insurance_direct', 'free_pilot')),
  payment_method TEXT CHECK (payment_method IN ('sepa_debit', 'invoice', 'card', 'paypal', 'apple_pay', 'google_pay', 'org_invoice', 'pilot_free')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'refunded', 'failed')),
  payer_user_id UUID REFERENCES public.users(id),
  insurance_name TEXT,
  insurance_reimbursed BOOLEAN DEFAULT false,
  insurance_reimbursed_at TIMESTAMPTZ,
  insurance_amount_cents INTEGER,
  invoice_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Top-5 Kassen
INSERT INTO insurance_configs (name, short_name, submission_type, instructions) VALUES
  ('AOK Baden-Wuerttemberg', 'AOK', 'app_link', 'Oeffnen Sie die AOK-App "Mein AOK". Gehen Sie zu "Leistungen" → "Praevention". Laden Sie die Bescheinigung hoch.'),
  ('Techniker Krankenkasse', 'TK', 'app_link', 'Oeffnen Sie die TK-App. Gehen Sie zu "Meine TK" → "Bescheinigungen einreichen". Fotografieren oder laden Sie die Bescheinigung hoch.'),
  ('Barmer', 'Barmer', 'web_upload', 'Gehen Sie auf barmer.de/meine-barmer. Melden Sie sich an. Unter "Erstattungen" koennen Sie die Bescheinigung hochladen.'),
  ('DAK Gesundheit', 'DAK', 'app_link', 'Oeffnen Sie die DAK-App. Unter "Service" → "Belege einreichen" koennen Sie die Bescheinigung fotografieren.'),
  ('IKK classic', 'IKK', 'email', 'Senden Sie die Bescheinigung per E-Mail an service@ikk-classic.de mit dem Betreff "Erstattung Praeventionskurs".');

-- RLS aktivieren
ALTER TABLE insurance_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE prevention_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE prevention_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE prevention_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prevention_course_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE prevention_group_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE prevention_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE prevention_visibility_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE prevention_payments ENABLE ROW LEVEL SECURITY;

-- Insurance configs: Alle lesen
CREATE POLICY insurance_configs_read ON insurance_configs FOR SELECT USING (true);

-- Kurse: Alle lesen (im eigenen Quartier)
CREATE POLICY prevention_courses_read ON prevention_courses FOR SELECT USING (true);
CREATE POLICY prevention_courses_manage ON prevention_courses FOR ALL USING (instructor_id = auth.uid());

-- Enrollments: Eigene Daten
CREATE POLICY prevention_enrollments_own ON prevention_enrollments FOR ALL USING (user_id = auth.uid());
CREATE POLICY prevention_enrollments_instructor ON prevention_enrollments FOR SELECT USING (
  course_id IN (SELECT id FROM prevention_courses WHERE instructor_id = auth.uid())
);

-- Sessions: Eigene Daten
CREATE POLICY prevention_sessions_own ON prevention_sessions FOR ALL USING (
  enrollment_id IN (SELECT id FROM prevention_enrollments WHERE user_id = auth.uid())
);
CREATE POLICY prevention_sessions_instructor ON prevention_sessions FOR SELECT USING (
  enrollment_id IN (
    SELECT pe.id FROM prevention_enrollments pe
    JOIN prevention_courses pc ON pc.id = pe.course_id
    WHERE pc.instructor_id = auth.uid()
  )
);

-- Content: Eingeschriebene + Kursleiter
CREATE POLICY prevention_content_read ON prevention_course_content FOR SELECT USING (
  course_id IN (
    SELECT id FROM prevention_courses WHERE instructor_id = auth.uid()
    UNION
    SELECT course_id FROM prevention_enrollments WHERE user_id = auth.uid()
  )
);
CREATE POLICY prevention_content_manage ON prevention_course_content FOR ALL USING (
  course_id IN (SELECT id FROM prevention_courses WHERE instructor_id = auth.uid())
);

-- Group Calls: Eingeschriebene + Kursleiter
CREATE POLICY prevention_calls_read ON prevention_group_calls FOR SELECT USING (
  course_id IN (
    SELECT id FROM prevention_courses WHERE instructor_id = auth.uid()
    UNION
    SELECT course_id FROM prevention_enrollments WHERE user_id = auth.uid()
  )
);

-- Messages: Eigene Nachrichten
CREATE POLICY prevention_messages_read ON prevention_messages FOR SELECT USING (
  recipient_id = auth.uid()
  OR (recipient_id IS NULL AND course_id IN (
    SELECT course_id FROM prevention_enrollments WHERE user_id = auth.uid()
  ))
  OR sender_id = auth.uid()
);
CREATE POLICY prevention_messages_insert ON prevention_messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND sender_id IN (SELECT instructor_id FROM prevention_courses WHERE id = course_id)
);

-- Visibility Consent: Nur Senior selbst
CREATE POLICY prevention_consent_own ON prevention_visibility_consent FOR ALL USING (user_id = auth.uid());

-- Payments: Eigene + Kursleiter
CREATE POLICY prevention_payments_own ON prevention_payments FOR ALL USING (
  enrollment_id IN (SELECT id FROM prevention_enrollments WHERE user_id = auth.uid())
);
