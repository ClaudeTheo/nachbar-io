-- Migration 075: Video-Anrufe (Plus Familien-Calls + Pro Medical Tracking)
-- Zweck: Videoanrufe zwischen Bewohnern und Angehoerigen (Plus) sowie Arzt-Sprechstunden (Pro)

CREATE TABLE video_calls (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  callee_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type             TEXT NOT NULL CHECK (type IN ('plus_family', 'pro_medical')) DEFAULT 'plus_family',
  started_at       TIMESTAMPTZ DEFAULT now(),
  ended_at         TIMESTAMPTZ,
  duration_seconds INTEGER,
  status           TEXT NOT NULL CHECK (status IN ('ringing', 'active', 'ended', 'missed', 'rejected')) DEFAULT 'ringing',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indizes fuer schnelle Abfragen nach Anrufer und Empfaenger
CREATE INDEX idx_video_calls_caller ON video_calls(caller_id);
CREATE INDEX idx_video_calls_callee ON video_calls(callee_id);
CREATE INDEX idx_video_calls_status ON video_calls(status) WHERE status IN ('ringing', 'active');

-- RLS aktivieren
ALTER TABLE video_calls ENABLE ROW LEVEL SECURITY;

-- Anrufer oder Empfaenger sehen eigene Anrufe
CREATE POLICY "video_calls_select_own" ON video_calls
  FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Anrufer erstellt den Anruf — bei plus_family muss eine aktive caregiver_links-Verknuepfung bestehen
CREATE POLICY "video_calls_insert_caller" ON video_calls
  FOR INSERT WITH CHECK (
    auth.uid() = caller_id
    AND (
      -- Pro Medical: Arzt ruft Patient an (keine caregiver_link noetig)
      type = 'pro_medical'
      OR
      -- Plus Family: Nur wenn aktive Verknuepfung ueber caregiver_links existiert
      (type = 'plus_family' AND EXISTS (
        SELECT 1 FROM caregiver_links
        WHERE caregiver_links.revoked_at IS NULL
          AND (
            -- Caregiver ruft Bewohner an
            (caregiver_links.caregiver_id = auth.uid() AND caregiver_links.resident_id = callee_id)
            OR
            -- Bewohner ruft Caregiver an
            (caregiver_links.resident_id = auth.uid() AND caregiver_links.caregiver_id = callee_id)
          )
      ))
    )
  );

-- Anrufer oder Empfaenger kann Status aktualisieren (z.B. annehmen, beenden, ablehnen)
CREATE POLICY "video_calls_update_participants" ON video_calls
  FOR UPDATE USING (auth.uid() = caller_id OR auth.uid() = callee_id)
  WITH CHECK (auth.uid() = caller_id OR auth.uid() = callee_id);
