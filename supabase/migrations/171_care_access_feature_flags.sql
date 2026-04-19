-- Migration 171: Care-Access + KI-Provider Feature-Flags
-- Task: Senior-App Stufe-1 Plan (docs/plans/2026-04-19-senior-app-stufe1-implementation.md)
-- Kontext: Admin-Dashboard bekommt neue Gruppe "Care-Access" mit 7 Flags.
--   4 Scan-Zugriffsgruppen (A/B/C/E) + 3 KI-Provider-Optionen.
-- Rueckbau: 171_care_access_feature_flags.down.sql
-- Idempotent: ja (ON CONFLICT DO NOTHING).

begin;

insert into public.feature_flags (key, enabled, required_plans, description)
values
  -- Care-Access-Gruppen (QR-Scan fuer Pflege/Familie)
  (
    'CARE_ACCESS_FAMILY',
    false,
    array[]::text[],
    'QR-Scan-Zugriff fuer Familie/Freunde (Gruppe A, Pilot-Default ON nach Release)'
  ),
  (
    'CARE_ACCESS_INDIVIDUAL_CAREGIVER',
    false,
    array['pro']::text[],
    'QR-Scan-Zugriff fuer Einzel-Pflegerinnen (Gruppe B, Stufe 2)'
  ),
  (
    'CARE_ACCESS_CARE_COMPANY',
    false,
    array['pro']::text[],
    'QR-Scan-Zugriff fuer Pflegefirmen/Heime (Gruppe C, Stufe 3 nach Zulassung)'
  ),
  (
    'CARE_ACCESS_EMERGENCY',
    false,
    array[]::text[],
    'Oeffentliche Notfall-Karte per QR-Token (Gruppe E, Default OFF bis Opt-In-UI live)'
  ),
  -- KI-Provider (genau einer sollte true sein wenn KI-Onboarding aktiv)
  (
    'AI_PROVIDER_CLAUDE',
    false,
    array[]::text[],
    'KI-Provider Claude Haiku 4 (Pilot-Default nach AVV-Unterzeichnung)'
  ),
  (
    'AI_PROVIDER_MISTRAL',
    false,
    array[]::text[],
    'KI-Provider Mistral Small Paris (volle EU-DSGVO-Alternative)'
  ),
  (
    'AI_PROVIDER_OFF',
    true,
    array[]::text[],
    'KI komplett aus - Formular-only-Onboarding (aktiver Default bis KI ready)'
  )
on conflict (key) do nothing;

commit;
