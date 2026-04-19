-- Rueckbau Migration 173: Memory-Consents + AI-Onboarding Consent
-- Setzt care_consents.feature CHECK-Constraint auf Vor-Mig-108-Ursprungszustand zurueck.
-- Comments werden nicht aktiv zurueckgesetzt (kosten nichts, dokumentieren Historie).

begin;

alter table public.care_consents
  drop constraint if exists care_consents_feature_check;

alter table public.care_consents
  add constraint care_consents_feature_check
  check (feature in (
    'sos',
    'checkin',
    'medications',
    'care_profile',
    'emergency_contacts'
  ));

-- Vor dem Rueckbau sicherstellen, dass keine Consent-Rows mit feature='ai_onboarding'
-- mehr existieren (sonst schlaegt ADD CONSTRAINT fehl). Optional, daher auskommentiert.
-- delete from public.care_consents where feature = 'ai_onboarding';

commit;
