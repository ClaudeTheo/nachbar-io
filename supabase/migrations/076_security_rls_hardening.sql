-- Migration 076: Security RLS Hardening (H3, H4, H5, H6)
-- Security-Audit Session 2 Fixes

-- ============================================================
-- H3: notifications INSERT — einschraenken auf eigene User-ID
-- Alte Policy: auth.uid() IS NOT NULL (jeder kann fuer jeden erstellen)
-- Neue Policy: user_id = auth.uid() (nur fuer sich selbst)
-- API-Route nutzt Service Role Key und umgeht RLS ohnehin
-- ============================================================
DROP POLICY IF EXISTS "notif_insert_authenticated" ON notifications;
CREATE POLICY "notif_insert_self_only" ON notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================
-- H4: care_audit_log INSERT — actor_id muss auth.uid() sein
-- Alte Policy: auth.uid() IS NOT NULL (jeder kann beliebige Eintraege schreiben)
-- Neue Policy: actor_id = auth.uid() (nur eigene Aktionen protokollieren)
-- ============================================================
DROP POLICY IF EXISTS "care_audit_insert" ON care_audit_log;
CREATE POLICY "care_audit_insert_actor" ON care_audit_log
  FOR INSERT WITH CHECK (actor_id = auth.uid());

-- ============================================================
-- H5: video_calls INSERT — Doctor-Profile-Check fuer pro_medical
-- Alte Policy: type = 'pro_medical' erlaubt ohne Doctor-Pruefung
-- Neue Policy: pro_medical erfordert doctor_profiles Eintrag
-- ============================================================
DROP POLICY IF EXISTS "video_calls_insert_caller" ON video_calls;
CREATE POLICY "video_calls_insert_caller_v2" ON video_calls
  FOR INSERT WITH CHECK (
    auth.uid() = caller_id
    AND (
      -- Pro Medical: Caller muss ein verifizierter Arzt sein
      (type = 'pro_medical' AND EXISTS (
        SELECT 1 FROM doctor_profiles
        WHERE doctor_profiles.user_id = auth.uid()
          AND doctor_profiles.visible = true
      ))
      OR
      -- Plus Family: Aktive Caregiver-Verknuepfung erforderlich
      (type = 'plus_family' AND EXISTS (
        SELECT 1 FROM caregiver_links
        WHERE caregiver_links.revoked_at IS NULL
          AND (
            (caregiver_links.caregiver_id = auth.uid() AND caregiver_links.resident_id = callee_id)
            OR
            (caregiver_links.resident_id = auth.uid() AND caregiver_links.caregiver_id = callee_id)
          )
      ))
    )
  );

-- ============================================================
-- H6: appointments — Patient-INSERT erlauben (Patienten buchen selbst)
-- Bestehende Policy bleibt: appointments_doctor_write (doctor_id = auth.uid())
-- Neue Policy: Patienten koennen Termine buchen wo sie selbst patient_id sind
-- ============================================================
CREATE POLICY "appointments_patient_insert" ON appointments
  FOR INSERT WITH CHECK (patient_id = auth.uid());
