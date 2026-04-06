-- Migration 149: Civic Message Attachments
-- Tabelle + Bucket + RLS fuer Datei-Anhaenge an Postfach-Nachrichten

-- 1. Tabelle fuer Attachment-Metadaten
CREATE TABLE civic_message_attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    UUID NOT NULL REFERENCES civic_messages(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,
  filename      TEXT NOT NULL,
  file_size     INTEGER NOT NULL,
  mime_type     TEXT NOT NULL,
  uploaded_by   UUID NOT NULL REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_civic_attachments_message ON civic_message_attachments(message_id);

-- 2. RLS auf Attachment-Tabelle
ALTER TABLE civic_message_attachments ENABLE ROW LEVEL SECURITY;

-- Buerger sieht Attachments eigener Nachrichten
CREATE POLICY "citizen_read_own_attachments" ON civic_message_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM civic_messages cm
      WHERE cm.id = message_id
        AND cm.citizen_user_id = auth.uid()
    )
  );

-- Staff sieht Attachments der eigenen Org
CREATE POLICY "staff_read_org_attachments" ON civic_message_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM civic_messages cm
      JOIN civic_members cmem ON cmem.org_id = cm.org_id
        AND cmem.user_id = auth.uid()
      WHERE cm.id = message_id
    )
  );

-- Insert nur via Service-Role (API-Route)
CREATE POLICY "service_insert_attachments" ON civic_message_attachments
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- 3. Storage-Bucket (privat, 10MB, PDF/JPG/PNG)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'civic-attachments',
  'civic-attachments',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
);

-- 4. Storage-RLS: Lesen ueber Signed URLs (API prueft vorher), Upload nur Service-Role
CREATE POLICY "citizen_read_attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'civic-attachments'
    AND EXISTS (
      SELECT 1 FROM civic_message_attachments cma
      JOIN civic_messages cm ON cm.id = cma.message_id
      WHERE cma.storage_path = name
        AND cm.citizen_user_id = auth.uid()
    )
  );

CREATE POLICY "staff_read_attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'civic-attachments'
    AND EXISTS (
      SELECT 1 FROM civic_message_attachments cma
      JOIN civic_messages cm ON cm.id = cma.message_id
      JOIN civic_members cmem ON cmem.org_id = cm.org_id
        AND cmem.user_id = auth.uid()
      WHERE cma.storage_path = name
    )
  );

CREATE POLICY "service_upload_civic_attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'civic-attachments'
    AND auth.role() = 'service_role'
  );
