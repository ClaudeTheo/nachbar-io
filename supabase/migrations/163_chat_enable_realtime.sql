-- Migration 163: Realtime-Publication fuer Chat-Tabellen aktivieren
--
-- STATUS: ANGEWENDET am 2026-04-17 abends
-- Migration-Name bei apply: chat_enable_realtime
--
-- Ohne diese Einstellung liefert Supabase Realtime keine INSERT-Events
-- fuer direct_messages oder chat_group_messages, und der useChatRealtime-
-- Hook im Client bleibt taub. Ergebnis waere: Nachrichten erscheinen
-- beim anderen User erst nach manuellem Reload.

BEGIN;

ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE contact_links;

COMMIT;
