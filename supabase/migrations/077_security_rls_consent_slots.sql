-- Migration 077: Security RLS Fixes (M6, M7)
-- M6: consent_versions — nur authentifizierte User lesen
-- M7: consultation_slots UPDATE — Quartier-Check beim Buchen

-- ============================================================
-- M6: consent_versions SELECT — von USING(true) auf auth-only
-- ============================================================
DROP POLICY IF EXISTS "consent_versions_read" ON consent_versions;
CREATE POLICY "consent_versions_read_auth" ON consent_versions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================
-- M7: consultation_slots — Quartier-Check beim Buchen
-- Alte Policy: Jeder Auth-User kann jeden freien Slot buchen
-- Neue Policy: Nur User im gleichen Quartier koennen buchen
-- ============================================================
DROP POLICY IF EXISTS "consultation_book_resident" ON consultation_slots;
CREATE POLICY "consultation_book_resident_v2" ON consultation_slots
  FOR UPDATE
  USING (
    booked_by IS NULL
    AND status = 'scheduled'
    AND quarter_id IN (
      SELECT h.quarter_id
      FROM household_members hm
      JOIN households h ON h.id = hm.household_id
      WHERE hm.user_id = auth.uid()
    )
  )
  WITH CHECK (booked_by = auth.uid());
