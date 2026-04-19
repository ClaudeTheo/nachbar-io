-- Rueckbau Migration 173: Memory-Consents + AI-Onboarding Consent
-- Setzt care_consents.feature CHECK-Constraint auf Vor-Mig-173-Ursprungszustand zurueck.
-- Comments werden nicht aktiv zurueckgesetzt (kosten nichts, dokumentieren Historie).
--
-- Defensive Vorab-Pruefung (Codex-Review F6.3): bricht ab wenn noch
-- ai_onboarding-Consent-Rows existieren — sonst wuerde das anschliessende
-- ADD CONSTRAINT mit einem CHECK-Violation-Fehler crashen.

begin;

-- 1. Pruefen ob noch Daten betroffen sind. Wenn ja: harter Abbruch mit
--    klarer Fehlermeldung — Operator entscheidet, ob delete oder migrate.
do $$
declare
  ai_onboarding_count integer;
begin
  select count(*) into ai_onboarding_count
  from public.care_consents
  where feature = 'ai_onboarding';

  if ai_onboarding_count > 0 then
    raise exception
      'Mig 173 .down.sql ABGEBROCHEN: % Rows mit feature=ai_onboarding existieren noch. '
      'Vor Rollback explizit entscheiden: '
      'a) DELETE FROM public.care_consents WHERE feature = ''ai_onboarding''; '
      'b) Daten umtaufen auf einen anderen Feature-Key. '
      'c) Mig 173 NICHT zurueckbauen.',
      ai_onboarding_count;
  end if;
end$$;

-- 2. Erst nach dem Check: Constraint austauschen
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

commit;
