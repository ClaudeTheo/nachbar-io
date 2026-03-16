-- Migration 074: Pro Medical Erweiterungen
-- Zweck: Terminbuchung, Anamneseboegen, Arzt-Profile, Bewertungen

-- Arzt-Profile (oeffentlich auf nachbar.io)
CREATE TABLE doctor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  org_id UUID REFERENCES organizations(id),
  specialization TEXT[], -- ['Allgemeinmedizin', 'Innere Medizin']
  bio TEXT,
  avatar_url TEXT,
  visible BOOLEAN DEFAULT true,
  accepts_new_patients BOOLEAN DEFAULT true,
  video_consultation BOOLEAN DEFAULT true,
  quarter_ids UUID[] DEFAULT '{}', -- Zugewiesene Quartiere
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Online-Termine (Patienten buchen selbst)
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES auth.users(id),
  patient_id UUID REFERENCES auth.users(id),
  patient_name TEXT, -- Fuer nicht-registrierte Patienten
  patient_email TEXT,
  patient_phone TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 15,
  type TEXT CHECK (type IN ('video', 'phone', 'in_person')) DEFAULT 'video',
  status TEXT CHECK (status IN ('booked', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')) DEFAULT 'booked',
  notes_encrypted TEXT, -- AES-256-GCM verschluesselt
  meeting_url TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Digitale Anamneseboegen
CREATE TABLE anamnesis_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users(id),
  patient_id UUID REFERENCES auth.users(id),
  form_data_encrypted TEXT NOT NULL, -- AES-256-GCM
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- Bewertungen (Quartiersbewohner bewerten Aerzte)
CREATE TABLE doctor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES auth.users(id),
  patient_id UUID NOT NULL REFERENCES auth.users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  text TEXT,
  visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(doctor_id, patient_id) -- Ein Review pro Patient pro Arzt
);

-- Recall-System (Vorsorge-Erinnerungen)
CREATE TABLE recall_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES auth.users(id),
  patient_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL, -- 'checkup', 'vaccination', 'screening', 'follow_up'
  due_date DATE NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'acknowledged', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indizes
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_at);
CREATE INDEX idx_doctor_profiles_visible ON doctor_profiles(visible) WHERE visible = true;
CREATE INDEX idx_doctor_reviews_doctor ON doctor_reviews(doctor_id);
CREATE INDEX idx_recall_due ON recall_reminders(due_date) WHERE status = 'pending';

-- RLS aktivieren
ALTER TABLE doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE anamnesis_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE recall_reminders ENABLE ROW LEVEL SECURITY;

-- Arzt-Profil: Oeffentlich lesbar, nur eigener Arzt kann schreiben
CREATE POLICY "doctor_profiles_public_read" ON doctor_profiles
  FOR SELECT USING (visible = true OR user_id = auth.uid());
CREATE POLICY "doctor_profiles_own_write" ON doctor_profiles
  FOR ALL USING (user_id = auth.uid());

-- Termine: Arzt + Patient sehen eigene
CREATE POLICY "appointments_own" ON appointments
  FOR SELECT USING (doctor_id = auth.uid() OR patient_id = auth.uid());
CREATE POLICY "appointments_doctor_write" ON appointments
  FOR INSERT WITH CHECK (doctor_id = auth.uid());
CREATE POLICY "appointments_doctor_update" ON appointments
  FOR UPDATE USING (doctor_id = auth.uid());

-- Anamneseboegen: Arzt + Patient
CREATE POLICY "anamnesis_own" ON anamnesis_forms
  FOR SELECT USING (doctor_id = auth.uid() OR patient_id = auth.uid());
CREATE POLICY "anamnesis_patient_insert" ON anamnesis_forms
  FOR INSERT WITH CHECK (patient_id = auth.uid());

-- Bewertungen: Oeffentlich lesbar, Patient kann eigene schreiben
CREATE POLICY "reviews_public_read" ON doctor_reviews
  FOR SELECT USING (visible = true);
CREATE POLICY "reviews_patient_write" ON doctor_reviews
  FOR INSERT WITH CHECK (patient_id = auth.uid());

-- Recall: Nur Arzt sieht + schreibt
CREATE POLICY "recall_doctor_own" ON recall_reminders
  FOR ALL USING (doctor_id = auth.uid());
