-- Rollback fuer Migration 163

BEGIN;

ALTER PUBLICATION supabase_realtime DROP TABLE contact_links;
ALTER PUBLICATION supabase_realtime DROP TABLE chat_groups;
ALTER PUBLICATION supabase_realtime DROP TABLE conversations;
ALTER PUBLICATION supabase_realtime DROP TABLE chat_group_messages;
ALTER PUBLICATION supabase_realtime DROP TABLE direct_messages;

COMMIT;
