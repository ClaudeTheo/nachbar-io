-- Rueckbau Migration 170: Gesundheits-Flags entfernen
begin;
delete from public.feature_flags
where key in ('MEDICATIONS_ENABLED','DOCTORS_ENABLED');
commit;
