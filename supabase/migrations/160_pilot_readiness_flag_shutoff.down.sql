-- Rollback fuer Migration 160: Pilot-Readiness Flags wieder aktivieren
-- Task: J-1 + I-0 (Rueckbau)
-- Kontext: Stellt den Seed-Default (enabled=true) wieder her.
-- Quelle: Seed in 086_feature_flags.sql, 101_kommunal_feature_flag.sql,
-- 106_craftsman_portal.sql (alle setzen enabled=true im Insert).

begin;

update public.feature_flags
set enabled = true, updated_at = now()
where key in (
  'BOARD_ENABLED',
  'MARKETPLACE_ENABLED',
  'HANDWERKER_PORTAL',
  'KOMMUNAL_MODULE',
  'QUARTER_PROGRESS',
  'GDT_ENABLED',
  'VIDEO_CONSULTATION',
  'MODERATION_ENABLED',
  'ORG_DASHBOARD',
  'QUARTER_STATS'
);

commit;
