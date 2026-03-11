-- ============================================================
-- Nachbar.io — Migration 017: Storage Bucket + RLS Policies
-- Bilder-Upload fuer Avatare, Marktplatz, Fundbuero, Leihboerse
-- ============================================================

-- Bucket erstellen (public = true fuer Lese-Zugriff, RLS fuer Schreib-Zugriff)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  2097152,  -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- RLS Policies fuer storage.objects
-- ============================================================

-- 1. LESEN: Alle koennen Bilder lesen (public bucket)
CREATE POLICY "images_read_all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images');

-- 2. AVATAR-UPLOAD: Nutzer kann NUR eigenes Avatar hochladen
CREATE POLICY "avatar_upload_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = 'avatars'
    AND auth.uid() IS NOT NULL
    AND name LIKE 'avatars/' || auth.uid()::text || '%'
  );

-- 3. AVATAR-UPDATE: Nutzer kann eigenes Avatar ueberschreiben
CREATE POLICY "avatar_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'images'
    AND name LIKE 'avatars/' || auth.uid()::text || '%'
  );

-- 4. AVATAR-LOESCHEN: Nutzer kann eigenes Avatar loeschen
CREATE POLICY "avatar_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'images'
    AND name LIKE 'avatars/' || auth.uid()::text || '%'
  );

-- 5. KATEGORIE-BILDER UPLOAD: Verifizierte Mitglieder
CREATE POLICY "category_images_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] IN ('marketplace', 'lost-found', 'leihboerse')
    AND EXISTS (
      SELECT 1 FROM household_members
      WHERE user_id = auth.uid()
      AND verified_at IS NOT NULL
    )
  );

-- 6. KATEGORIE-BILDER LOESCHEN: Verifizierte Mitglieder
CREATE POLICY "category_images_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] IN ('marketplace', 'lost-found', 'leihboerse')
    AND auth.uid() IS NOT NULL
  );
