-- 168 — TTS Phrase-Cache Bucket
-- Layer-1 Voice-Latenz-Fix: Wiederholte TTS-Phrasen aus Supabase Storage servieren
-- (Cache-Hit ~0ms via CDN, Miss ~500ms OpenAI + async Upload).
--
-- Sicherheit:
--   Public read — Cache-Key ist SHA-256 vom (text,voice,speed,version),
--   nicht rueckwaerts aufloesbar; niemals User-spezifische/sensible Texte cachen.
--   Schreiben nur service_role (Next.js API mit SUPABASE_SERVICE_ROLE_KEY).

-- Bucket: idempotent
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tts-cache', 'tts-cache', true, 5242880, array['audio/mpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Policies: idempotent via DROP + CREATE
drop policy if exists "tts-cache public read" on storage.objects;
create policy "tts-cache public read"
  on storage.objects for select
  using (bucket_id = 'tts-cache');

drop policy if exists "tts-cache service write" on storage.objects;
create policy "tts-cache service write"
  on storage.objects for insert
  with check (bucket_id = 'tts-cache' and auth.role() = 'service_role');

drop policy if exists "tts-cache service update" on storage.objects;
create policy "tts-cache service update"
  on storage.objects for update
  using (bucket_id = 'tts-cache' and auth.role() = 'service_role');
