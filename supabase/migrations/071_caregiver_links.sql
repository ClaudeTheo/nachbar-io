-- 071_caregiver_links.sql
-- Nachbar.io — Caregiver-System: Einladungen + Verknuepfungen (DSGVO Art. 6 Abs. 1a)

-- Einladungs-Codes (8-stellig, 24h gueltig, einmalig)
CREATE TABLE caregiver_invites (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code  text UNIQUE NOT NULL,
  expires_at   timestamptz NOT NULL,
  used_at      timestamptz,
  used_by      uuid REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE caregiver_invites ENABLE ROW LEVEL SECURITY;

-- Bewohner sieht nur eigene Einladungen
CREATE POLICY "caregiver_invites_select_own" ON caregiver_invites
  FOR SELECT USING (auth.uid() = resident_id);

-- Bewohner erstellt eigene Einladungen
CREATE POLICY "caregiver_invites_insert_own" ON caregiver_invites
  FOR INSERT WITH CHECK (auth.uid() = resident_id);

-- Caregiver-Verknuepfungen
CREATE TABLE caregiver_links (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  caregiver_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_type  text NOT NULL CHECK (relationship_type IN (
    'partner', 'child', 'grandchild', 'friend', 'volunteer', 'other'
  )),
  heartbeat_visible  boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  revoked_at         timestamptz,
  UNIQUE(resident_id, caregiver_id)
);

ALTER TABLE caregiver_links ENABLE ROW LEVEL SECURITY;

-- Bewohner sieht alle eigenen Links (aktiv + widerrufen)
CREATE POLICY "caregiver_links_select_resident" ON caregiver_links
  FOR SELECT USING (auth.uid() = resident_id);

-- Caregiver sieht nur aktive Links
CREATE POLICY "caregiver_links_select_caregiver" ON caregiver_links
  FOR SELECT USING (auth.uid() = caregiver_id AND revoked_at IS NULL);

-- Bewohner kann heartbeat_visible und revoked_at aendern
CREATE POLICY "caregiver_links_update_resident" ON caregiver_links
  FOR UPDATE USING (auth.uid() = resident_id)
  WITH CHECK (auth.uid() = resident_id);

-- Caregiver-Policy fuer Heartbeat-Zugriff (haengt von caregiver_links ab)
CREATE POLICY "heartbeats_select_caregiver" ON heartbeats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM caregiver_links
      WHERE caregiver_links.caregiver_id = auth.uid()
        AND caregiver_links.resident_id = heartbeats.user_id
        AND caregiver_links.heartbeat_visible = true
        AND caregiver_links.revoked_at IS NULL
    )
  );
