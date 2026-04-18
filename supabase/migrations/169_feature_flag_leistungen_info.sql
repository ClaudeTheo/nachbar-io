-- Migration 169: Feature-Flag 'leistungen_info' (Default OFF)
-- Task: Leistungen-Info "Was steht uns zu?" (Block A / Task 1)
-- Kontext: Info-Navigator fuer deutsche + schweizerische Pflege-Sozialleistungen.
--          Admin kann Flag via Super-Admin-Dashboard (FeatureFlagManager) togglen.
-- Rueckbau: 169_feature_flag_leistungen_info.down.sql
-- Idempotent: ja (ON CONFLICT DO NOTHING).

begin;

insert into public.feature_flags (key, enabled, description)
values (
  'leistungen_info',
  false,
  'Info-Seite "Was steht uns zu?" mit deutschen und schweizerischen Pflege-Sozialleistungen (Plus-Feature)'
)
on conflict (key) do nothing;

commit;
