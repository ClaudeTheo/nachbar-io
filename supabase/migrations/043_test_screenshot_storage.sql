-- Migration 043: Storage-Policy fuer Test-Screenshots
-- Tester koennen Screenshots zu Testergebnissen hochladen

-- INSERT: Tester duerfen in test-screenshots/ hochladen
CREATE POLICY "test_screenshots_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = 'test-screenshots'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_tester = true
    )
  );

-- DELETE: Tester duerfen eigene Screenshots loeschen (oder Admin)
CREATE POLICY "test_screenshots_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = 'test-screenshots'
    AND auth.uid() IS NOT NULL
  );
