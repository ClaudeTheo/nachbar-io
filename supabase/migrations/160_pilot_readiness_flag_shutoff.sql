-- Migration 160: Pilot-Readiness — Legacy- und Pro-Medical-Flags abschalten
-- Task: J-1 + I-0 (Phase-1-Implementation-Plan)
-- Kontext: Pilot in Bad Saeckingen soll nur die 10 Phase-1-Core-Features sehen.
-- Rueckbau: 160_pilot_readiness_flag_shutoff.down.sql
--
-- Hinweis zur Nummer: Codex-Brief 2026-04-14-codex-brief-pilot-readiness.md
-- nannte "156", aber 156..159 sind seit dem Brief belegt
-- (156_household_position_metadata, 157_external_api_flags,
-- 158_external_warning_cache, 159_external_api_flags_update).
-- Naechste freie Nummer: 160.
--
-- BUSINESSES_ENABLED ist bewusst NICHT enthalten:
-- Verifikation 2026-04-17 hat keinen erreichbaren Entry-Point ergeben
-- (kein /businesses-Route, kein Nav-Eintrag, kein Link aus anderen Seiten).
-- Eintrag im Readiness-Report Block 4 als "no-op Shutoff noetig".
--
-- Gating-Luecke (wird im Readiness-Report Block 4 als offene Task I-1 notiert):
-- /board/page.tsx und /marketplace/page.tsx haben KEINEN FeatureGate-Wrapper.
-- Das DB-seitige Abschalten greift nur, wenn Server-Komponenten oder API-Routes
-- isFeatureEnabledServer lesen — Page-Rendering selbst bleibt erreichbar.
-- /handwerker/page.tsx hat FeatureGate, dort greift das Abschalten.

begin;

update public.feature_flags
set enabled = false, updated_at = now()
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
