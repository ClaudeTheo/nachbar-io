-- Rollback fuer Migration 162: Chat-Media-Storage-Bucket

BEGIN;

DROP POLICY IF EXISTS chat_media_select ON storage.objects;
DROP POLICY IF EXISTS chat_media_insert ON storage.objects;
DROP POLICY IF EXISTS chat_media_delete ON storage.objects;

-- Bucket loeschen — scheitert, falls noch Objekte enthalten sind.
-- Absichtlich: Schutz vor versehentlichem Datenverlust.
DELETE FROM storage.buckets WHERE id = 'chat-media';

COMMIT;
