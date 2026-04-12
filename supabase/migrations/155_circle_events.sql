-- Migration 155: Termine im Familienkreis (circle_events)
-- Design-Doc 2026-04-10 Abschnitt 4.3, Tasks E-1..E-4
-- Deployed: 2026-04-12
--
-- Kontext:
--   Der "Kreis" ist implizit ueber caregiver_links definiert (resident + caregivers).
--   circle_events gehoeren einem Bewohner (resident_id). Alle im Kreis
--   (der Bewohner selbst + aktive Caregivers) koennen Events sehen.

CREATE TABLE circle_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_at  timestamptz NOT NULL,
  title         text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  who_comes     text NOT NULL DEFAULT '',
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

-- Index fuer "naechste Termine" Abfrage
CREATE INDEX idx_circle_events_upcoming
  ON circle_events (resident_id, scheduled_at)
  WHERE deleted_at IS NULL;

ALTER TABLE circle_events ENABLE ROW LEVEL SECURITY;

-- Bewohner sieht eigene Termine
CREATE POLICY "circle_events_select_resident" ON circle_events
  FOR SELECT USING (auth.uid() = resident_id AND deleted_at IS NULL);

-- Caregiver sieht Termine des zugewiesenen Bewohners
CREATE POLICY "circle_events_select_caregiver" ON circle_events
  FOR SELECT USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM caregiver_links
      WHERE caregiver_links.caregiver_id = auth.uid()
        AND caregiver_links.resident_id = circle_events.resident_id
        AND caregiver_links.revoked_at IS NULL
    )
  );

-- Bewohner kann eigene Termine anlegen
CREATE POLICY "circle_events_insert_resident" ON circle_events
  FOR INSERT WITH CHECK (auth.uid() = resident_id);

-- Caregiver kann Termine fuer zugewiesenen Bewohner anlegen
CREATE POLICY "circle_events_insert_caregiver" ON circle_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM caregiver_links
      WHERE caregiver_links.caregiver_id = auth.uid()
        AND caregiver_links.resident_id = circle_events.resident_id
        AND caregiver_links.revoked_at IS NULL
    )
  );

-- Nur der Ersteller kann updaten (soft-delete via deleted_at)
CREATE POLICY "circle_events_update_creator" ON circle_events
  FOR UPDATE USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);
