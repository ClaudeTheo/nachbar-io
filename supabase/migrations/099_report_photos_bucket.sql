-- Migration 099: Storage Bucket fuer Maengelmelder-Fotos
-- Zweck: Bildupload fuer Community-Meldungen (max 2MB, nur Bilder)

-- Bucket erstellen
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-photos',
  'report-photos',
  true,  -- oeffentlich lesbar (Fotos sollen auf Karte sichtbar sein)
  2097152, -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage Policies: Upload nur fuer authentifizierte Nutzer
CREATE POLICY "report_photos_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'report-photos'
    AND auth.role() = 'authenticated'
  );

-- Lesen: Oeffentlich (Fotos auf Quartierskarte)
CREATE POLICY "report_photos_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'report-photos'
  );

-- Loeschen: Nur der Uploader oder Admin
CREATE POLICY "report_photos_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'report-photos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    )
  );
