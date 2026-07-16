-- Advisor-Haertung Paket A (Triage 2026-07-14, siehe docs/security/2026-07-14-advisor-triage.md)
-- Founder-Go 2026-07-14. Nur risikofreie Drops, keine Verhaltensaenderung fuer App-Fluesse.

-- 1) RLS-2: claude_messages ist ein ungenutzter Drift-Tisch (nur Baseline-Snapshot,
--    kein App-Code). Die anon-ALL-Policy oeffnete ihn komplett fuer unauthentifizierte
--    Zugriffe -> Policy droppen = default deny. claude_messages_service (service_role) bleibt.
DO $$
BEGIN
  IF to_regclass('public.claude_messages') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS claude_messages_anon ON public.claude_messages';
  END IF;
END
$$;

-- 2) ST-1: Public Buckets brauchen keine SELECT-Policy fuer den Objektzugriff
--    (Public-URL umgeht RLS). Die breiten SELECT-Policies erlaubten nur das Listing
--    ALLER Dateien durch Clients. Kein .list()-Aufruf im App-Code vorhanden.
DROP POLICY IF EXISTS images_read_all ON storage.objects;
DROP POLICY IF EXISTS report_photos_select ON storage.objects;
DROP POLICY IF EXISTS "tts-cache public read" ON storage.objects;
