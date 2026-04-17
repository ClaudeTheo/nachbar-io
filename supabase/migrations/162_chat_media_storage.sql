-- Migration 162: Chat-Media-Storage-Bucket
--
-- STATUS: ENTWURF — NICHT ANGEWENDET
-- Plan-Dokument: docs/plans/2026-04-17-mvp-scope-quartier-plus-bruecken.md
-- Voraussetzung: 161_chat_foundation.sql + 161_chat_foundation_namespace_fix.sql
--
-- Zweck:
--   Supabase-Storage-Bucket `chat-media` fuer Bilder und Sprachnachrichten
--   aus 1:1- und Chat-Gruppen. RLS-Policies sorgen dafuer, dass nur
--   Teilnehmer der zugehoerigen Konversation/Chat-Gruppe Zugriff haben.
--
-- Groessen-Limit: 10 MB pro Datei
-- MIME-Typen: image/* und audio/*
-- Aufbewahrung: unbegrenzt im MVP; Cleanup-Job fuer >180 Tage ist Folgeschritt.
--
-- Pfad-Konvention:
--   direct/{conversation_id}/{uuid}.{ext}
--   chat/{chat_group_id}/{uuid}.{ext}
--
-- Die Konvention wird App-seitig enforced; die RLS-Policy parst das erste
-- Pfad-Segment ("direct" vs "chat") und die UUID im zweiten Segment.

BEGIN;

-- 1) Bucket anlegen
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chat-media',
    'chat-media',
    false,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif',
          'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4']
)
ON CONFLICT (id) DO UPDATE
    SET public = EXCLUDED.public,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2) RLS-Policies fuer storage.objects im chat-media Bucket
DROP POLICY IF EXISTS chat_media_select ON storage.objects;
CREATE POLICY chat_media_select ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'chat-media'
        AND (
            (
                (storage.foldername(name))[1] = 'direct'
                AND EXISTS (
                    SELECT 1 FROM conversations c
                    WHERE c.id::text = (storage.foldername(name))[2]
                      AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
                )
            )
            OR
            (
                (storage.foldername(name))[1] = 'chat'
                AND is_chat_group_member(((storage.foldername(name))[2])::uuid, auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS chat_media_insert ON storage.objects;
CREATE POLICY chat_media_insert ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'chat-media'
        AND auth.uid() IS NOT NULL
        AND (
            (
                (storage.foldername(name))[1] = 'direct'
                AND EXISTS (
                    SELECT 1 FROM conversations c
                    WHERE c.id::text = (storage.foldername(name))[2]
                      AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
                )
            )
            OR
            (
                (storage.foldername(name))[1] = 'chat'
                AND is_chat_group_member(((storage.foldername(name))[2])::uuid, auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS chat_media_delete ON storage.objects;
CREATE POLICY chat_media_delete ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'chat-media'
        AND owner = auth.uid()
    );

COMMIT;
