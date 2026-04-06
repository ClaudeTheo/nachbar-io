-- Migration 146: Vertikaler Durchstich — Bürger→Rathaus-Nachrichten
-- Erstellt civic_messages Tabelle mit RLS für Cross-Portal-Kommunikation

CREATE TABLE civic_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES civic_organizations(id) NOT NULL,
  citizen_user_id UUID REFERENCES auth.users(id) NOT NULL,
  subject TEXT NOT NULL CHECK (char_length(subject) BETWEEN 3 AND 200),
  body_encrypted TEXT NOT NULL,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent','read')),
  read_at TIMESTAMPTZ,
  read_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indizes fuer performante Abfragen
CREATE INDEX idx_civic_messages_org ON civic_messages(org_id);
CREATE INDEX idx_civic_messages_citizen ON civic_messages(citizen_user_id);
CREATE INDEX idx_civic_messages_created ON civic_messages(created_at DESC);

-- RLS aktivieren
ALTER TABLE civic_messages ENABLE ROW LEVEL SECURITY;

-- Buerger: eigene Nachrichten lesen
CREATE POLICY "civic_messages_citizen_select" ON civic_messages
  FOR SELECT USING (citizen_user_id = auth.uid());

-- Buerger: neue Nachrichten erstellen
CREATE POLICY "civic_messages_citizen_insert" ON civic_messages
  FOR INSERT WITH CHECK (citizen_user_id = auth.uid());

-- Rathaus-Staff: Nachrichten der eigenen Org lesen
CREATE POLICY "civic_messages_staff_select" ON civic_messages
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM civic_members WHERE user_id = auth.uid())
  );

-- Rathaus-Staff: Status updaten (nur eigene Org)
CREATE POLICY "civic_messages_staff_update" ON civic_messages
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM civic_members WHERE user_id = auth.uid())
  ) WITH CHECK (
    org_id IN (SELECT org_id FROM civic_members WHERE user_id = auth.uid())
  );

-- Service-Role: Insert fuer serverseitige API-Routes (nachbar-io)
CREATE POLICY "civic_messages_service_insert" ON civic_messages
  FOR INSERT WITH CHECK (true);
