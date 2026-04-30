-- Rollback fuer Migration 178: Phase-1-Default-Korrektur zuruecknehmen.
-- Nur lokal/Preview verwenden, nicht ohne Founder-Go auf Prod anwenden.

update public.feature_flags
set
  enabled = true,
  last_change_reason = 'rollback:phase-1-defaults'
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
and enabled is distinct from true;
