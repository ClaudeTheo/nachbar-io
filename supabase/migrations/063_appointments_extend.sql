-- 063_appointments_extend.sql
-- Termine-Erweiterung: Neue Kategorien und Sichtbarkeit

ALTER TABLE care_appointments DROP CONSTRAINT IF EXISTS care_appointments_type_check;
ALTER TABLE care_appointments ADD CONSTRAINT care_appointments_type_check
  CHECK (type IN (
    'doctor', 'care_service', 'therapy', 'other',
    'waste_collection', 'quarter_meeting', 'shopping', 'personal', 'birthday'
  ));

ALTER TABLE care_appointments
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private'
    CHECK (visibility IN ('private', 'helpers', 'quarter'));

CREATE INDEX IF NOT EXISTS idx_care_appointments_visibility
  ON care_appointments(visibility) WHERE visibility = 'quarter';

-- Quartiermitglieder koennen Quartier-Termine sehen
CREATE POLICY "care_appt_select_quarter" ON care_appointments
  FOR SELECT USING (
    visibility = 'quarter'
    AND EXISTS (
      SELECT 1 FROM household_members hm
      JOIN households h ON h.id = hm.household_id
      WHERE hm.user_id = auth.uid()
      AND h.quarter_id = (
        SELECT h2.quarter_id FROM household_members hm2
        JOIN households h2 ON h2.id = hm2.household_id
        WHERE hm2.user_id = care_appointments.senior_id LIMIT 1
      )
    )
  );
