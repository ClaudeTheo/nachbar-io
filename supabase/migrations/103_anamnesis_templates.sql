-- Migration 103: Anamnese-Vorlagen + Forms-Erweiterung
-- Zweck: Aerzte erstellen Anamnese-Vorlagen, Patienten fuellen per Token aus

-- Vorlagen-Tabelle
CREATE TABLE anamnesis_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_anamnesis_templates_doctor ON anamnesis_templates(doctor_id);

ALTER TABLE anamnesis_templates ENABLE ROW LEVEL SECURITY;

-- RLS: Nur eigener Arzt kann lesen/schreiben
CREATE POLICY "templates_doctor_read" ON anamnesis_templates
  FOR SELECT USING (doctor_id = auth.uid());
CREATE POLICY "templates_doctor_insert" ON anamnesis_templates
  FOR INSERT WITH CHECK (doctor_id = auth.uid());
CREATE POLICY "templates_doctor_update" ON anamnesis_templates
  FOR UPDATE USING (doctor_id = auth.uid());
CREATE POLICY "templates_doctor_delete" ON anamnesis_templates
  FOR DELETE USING (doctor_id = auth.uid());

-- Bestehende anamnesis_forms erweitern
ALTER TABLE anamnesis_forms ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES anamnesis_templates(id);
ALTER TABLE anamnesis_forms ADD COLUMN IF NOT EXISTS access_token TEXT UNIQUE;
ALTER TABLE anamnesis_forms ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE anamnesis_forms ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'expired'));

CREATE INDEX idx_anamnesis_forms_token ON anamnesis_forms(access_token) WHERE access_token IS NOT NULL;
CREATE INDEX idx_anamnesis_forms_appointment ON anamnesis_forms(appointment_id);

-- Patienten koennen per Token zugreifen (ohne Login)
CREATE POLICY "anamnesis_token_access" ON anamnesis_forms
  FOR SELECT USING (
    access_token IS NOT NULL
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Patienten koennen per Token ausfuellen
CREATE POLICY "anamnesis_token_submit" ON anamnesis_forms
  FOR UPDATE USING (
    access_token IS NOT NULL
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now())
  ) WITH CHECK (status = 'submitted');
