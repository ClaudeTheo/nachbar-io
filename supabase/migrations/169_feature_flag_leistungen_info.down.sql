-- Rueckbau Migration 169: Feature-Flag 'leistungen_info' entfernen
begin;
delete from public.feature_flags where key = 'leistungen_info';
commit;
