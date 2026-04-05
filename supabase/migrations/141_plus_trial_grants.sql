-- Migration 141: Kursbelohnung — Plus-Trial-Grants & Kurs-Bewertungen
-- Design: docs/plans/2026-04-05-kursbelohnung-plus-trial-design.md

-- 1. prevention_enrollments: Belohnungs-Stufe
ALTER TABLE prevention_enrollments
  ADD COLUMN IF NOT EXISTS reward_tier TEXT CHECK (reward_tier IN ('none', 'bronze', 'silver', 'gold')) DEFAULT 'none';

-- 2. caregiver_links: Plus-Trial-Ende
ALTER TABLE caregiver_links
  ADD COLUMN IF NOT EXISTS plus_trial_end TIMESTAMPTZ;

-- 3. Plus-Trial-Grants (Audit-Trail)
CREATE TABLE IF NOT EXISTS plus_trial_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES prevention_enrollments(id),
  caregiver_user_id UUID NOT NULL REFERENCES public.users(id),
  tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold')),
  months_granted INTEGER NOT NULL CHECK (months_granted BETWEEN 1 AND 3),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  converted_to_paid BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ
);

ALTER TABLE plus_trial_grants ENABLE ROW LEVEL SECURITY;

-- Angehoerige sehen eigene Grants
CREATE POLICY trial_grants_own ON plus_trial_grants FOR SELECT
  USING (caregiver_user_id = auth.uid());

-- Kursleiter sehen Grants ihrer Kurse
CREATE POLICY trial_grants_instructor ON plus_trial_grants FOR SELECT
  USING (enrollment_id IN (
    SELECT pe.id FROM prevention_enrollments pe
    JOIN prevention_courses pc ON pc.id = pe.course_id
    WHERE pc.instructor_id = auth.uid()
  ));

-- Teilnehmer duerfen Grants fuer eigene Angehoerige erstellen
CREATE POLICY trial_grants_insert ON plus_trial_grants FOR INSERT
  WITH CHECK (
    enrollment_id IN (
      SELECT id FROM prevention_enrollments WHERE user_id = auth.uid()
    )
  );

-- Teilnehmer duerfen eigene Grants updaten (Tier-Upgrade)
CREATE POLICY trial_grants_update ON plus_trial_grants FOR UPDATE
  USING (
    enrollment_id IN (
      SELECT id FROM prevention_enrollments WHERE user_id = auth.uid()
    )
  );

-- 4. Kurs-Bewertungen (fuer Gold-Stufe)
CREATE TABLE IF NOT EXISTS prevention_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES prevention_enrollments(id) UNIQUE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE prevention_reviews ENABLE ROW LEVEL SECURITY;

-- Eigene Bewertungen lesen/schreiben
CREATE POLICY reviews_own ON prevention_reviews FOR ALL USING (user_id = auth.uid());

-- Alle koennen Bewertungen lesen (Social Proof)
CREATE POLICY reviews_public ON prevention_reviews FOR SELECT USING (true);

-- 5. Indizes fuer Performance
CREATE INDEX IF NOT EXISTS idx_plus_trial_grants_caregiver ON plus_trial_grants(caregiver_user_id);
CREATE INDEX IF NOT EXISTS idx_plus_trial_grants_enrollment ON plus_trial_grants(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_plus_trial_grants_expires ON plus_trial_grants(expires_at) WHERE converted_to_paid = false;
CREATE INDEX IF NOT EXISTS idx_prevention_reviews_enrollment ON prevention_reviews(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_links_trial ON caregiver_links(plus_trial_end) WHERE plus_trial_end IS NOT NULL;
