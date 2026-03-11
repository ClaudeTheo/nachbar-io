-- 032_care_senior_checkins_migration.sql
-- Bestehende senior_checkins Daten nach care_checkins migrieren
-- und alte Tabelle als deprecated markieren

INSERT INTO care_checkins (senior_id, status, scheduled_at, completed_at, created_at)
SELECT
  user_id,
  'ok',
  checked_in_at,
  checked_in_at,
  checked_in_at
FROM senior_checkins
WHERE user_id IN (SELECT id FROM users)
ON CONFLICT DO NOTHING;

-- Kommentar als Deprecated-Marker
COMMENT ON TABLE senior_checkins IS 'DEPRECATED: Nutze care_checkins stattdessen. Daten migriert in Migration 032.';
