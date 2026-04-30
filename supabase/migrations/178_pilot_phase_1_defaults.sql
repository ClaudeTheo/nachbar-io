-- Migration 178: Phase-1-Defaults fuer Feature-Flags
-- DO NOT APPLY TO PROD UNTIL FOUNDER-GO FOR PHASE-1 SWITCH
-- Datei bewusst apply-later. Kein schema_migrations-Insert ohne Founder-Go.

update public.feature_flags
set
  enabled = false,
  last_change_reason = 'phase-1-defaults:apply-later'
where key in (
  'AI_PROVIDER_CLAUDE',
  'AI_PROVIDER_MISTRAL',
  'MEDICATIONS_ENABLED',
  'DOCTORS_ENABLED',
  'APPOINTMENTS_ENABLED',
  'VIDEO_CONSULTATION',
  'HEARTBEAT_ENABLED',
  'GDT_ENABLED',
  'CARE_ACCESS_INDIVIDUAL_CAREGIVER',
  'CARE_ACCESS_CARE_COMPANY',
  'MARKETPLACE',
  'EVENTS',
  'BOARD_ENABLED',
  'LOST_FOUND',
  'KOMMUNAL_MODULE',
  'MODERATION_ENABLED',
  'ORG_DASHBOARD',
  'QUARTER_STATS',
  'PUSH_NOTIFICATIONS',
  'NEWS_AI',
  'VIDEO_CALL_PLUS',
  'VIDEO_CALL_MEDICAL'
)
and enabled is distinct from false;
