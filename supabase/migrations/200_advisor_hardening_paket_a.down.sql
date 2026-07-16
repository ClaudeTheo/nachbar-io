-- Down: Vorher-Zustaende wiederherstellen (exakte Definitionen aus pg_policies, 2026-07-14)
CREATE POLICY claude_messages_anon ON public.claude_messages
  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY images_read_all ON storage.objects
  FOR SELECT USING (bucket_id = 'images');
CREATE POLICY report_photos_select ON storage.objects
  FOR SELECT USING (bucket_id = 'report-photos');
CREATE POLICY "tts-cache public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'tts-cache');
