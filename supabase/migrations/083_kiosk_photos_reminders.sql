-- Migration 083: Kiosk-Fotos und Erinnerungen (Welle 2)
-- Design-Referenz: docs/plans/2026-03-17-pi-kiosk-dashboard-redesign-design.md §5+6

-- =============================================================
-- 1. kiosk_photos — Familienfotos fuer den Pi-Kiosk
-- =============================================================
CREATE TABLE IF NOT EXISTS kiosk_photos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  uploaded_by     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storage_path    TEXT NOT NULL,
  caption         TEXT CHECK (length(caption) <= 100),
  pinned          BOOLEAN NOT NULL DEFAULT false,
  visible         BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kiosk_photos_household_visible
  ON kiosk_photos (household_id, visible, created_at DESC);

CREATE INDEX idx_kiosk_photos_uploaded_by
  ON kiosk_photos (uploaded_by, created_at DESC);

ALTER TABLE kiosk_photos ENABLE ROW LEVEL SECURITY;

-- Policy: Angehoerige duerfen Fotos ihres Bewohners sehen
CREATE POLICY kiosk_photos_select ON kiosk_photos
  FOR SELECT USING (
    household_id IN (
      SELECT h.id FROM households h
      JOIN household_members hm ON hm.household_id = h.id
      JOIN caregiver_links cl ON cl.resident_id = hm.user_id
      WHERE cl.caregiver_id = auth.uid() AND cl.revoked_at IS NULL
    )
    OR uploaded_by = auth.uid()
  );

CREATE POLICY kiosk_photos_insert ON kiosk_photos
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid()
    AND household_id IN (
      SELECT h.id FROM households h
      JOIN household_members hm ON hm.household_id = h.id
      JOIN caregiver_links cl ON cl.resident_id = hm.user_id
      WHERE cl.caregiver_id = auth.uid() AND cl.revoked_at IS NULL
    )
  );

CREATE POLICY kiosk_photos_update ON kiosk_photos
  FOR UPDATE USING (uploaded_by = auth.uid());

CREATE POLICY kiosk_photos_delete ON kiosk_photos
  FOR DELETE USING (uploaded_by = auth.uid());

-- =============================================================
-- 2. kiosk_reminders — Erinnerungen + Sticky Notes
-- =============================================================
CREATE TABLE IF NOT EXISTS kiosk_reminders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('appointment', 'sticky')),
  title           TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 80),
  scheduled_at    TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kiosk_reminders_household_active
  ON kiosk_reminders (household_id, created_at DESC)
  WHERE acknowledged_at IS NULL;

CREATE INDEX idx_kiosk_reminders_appointments
  ON kiosk_reminders (household_id, scheduled_at)
  WHERE type = 'appointment' AND acknowledged_at IS NULL;

ALTER TABLE kiosk_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY kiosk_reminders_select ON kiosk_reminders
  FOR SELECT USING (
    household_id IN (
      SELECT h.id FROM households h
      JOIN household_members hm ON hm.household_id = h.id
      JOIN caregiver_links cl ON cl.resident_id = hm.user_id
      WHERE cl.caregiver_id = auth.uid() AND cl.revoked_at IS NULL
    )
    OR created_by = auth.uid()
  );

CREATE POLICY kiosk_reminders_insert ON kiosk_reminders
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND household_id IN (
      SELECT h.id FROM households h
      JOIN household_members hm ON hm.household_id = h.id
      JOIN caregiver_links cl ON cl.resident_id = hm.user_id
      WHERE cl.caregiver_id = auth.uid() AND cl.revoked_at IS NULL
    )
  );

CREATE POLICY kiosk_reminders_update ON kiosk_reminders
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY kiosk_reminders_delete ON kiosk_reminders
  FOR DELETE USING (created_by = auth.uid());

ALTER TABLE kiosk_reminders ADD CONSTRAINT kiosk_reminders_appointment_needs_schedule
  CHECK (type != 'appointment' OR scheduled_at IS NOT NULL);
