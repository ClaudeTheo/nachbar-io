-- Rueckbau Migration 171: Care-Access + KI-Provider Flags entfernen
begin;
delete from public.feature_flags
where key in (
  'CARE_ACCESS_FAMILY',
  'CARE_ACCESS_INDIVIDUAL_CAREGIVER',
  'CARE_ACCESS_CARE_COMPANY',
  'CARE_ACCESS_EMERGENCY',
  'AI_PROVIDER_CLAUDE',
  'AI_PROVIDER_MISTRAL',
  'AI_PROVIDER_OFF'
);
commit;
