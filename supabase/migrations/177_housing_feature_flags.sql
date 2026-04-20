-- Migration 177: Hausverwaltungs-Feature-Flags
-- Task: A2b aus docs/plans/2026-04-21-hausverwaltung-modul-implementation.md
--       (Founder-Wunsch: Admin-Dashboard muss HV-Funktionen granular
--       an-/abschalten koennen)
-- Kontext: Admin-Dashboard bekommt neue Gruppe "Hausverwaltung" mit
--          1 Master-Flag + 4 Teilfunktions-Flags + 1 Schatten-Quartier-Flag.
-- Vorbild: 171_care_access_feature_flags.sql
-- Rueckbau: 177_housing_feature_flags.down.sql
-- Idempotent: ja (ON CONFLICT DO NOTHING).

begin;

insert into public.feature_flags (key, enabled, required_plans, description)
values
  -- Master-Schalter: gesamtes HV-Modul
  (
    'HOUSING_MODULE_ENABLED',
    false,
    array[]::text[],
    'Master-Schalter Hausverwaltungs-Modul. Wenn false: Kachel + Routen + API komplett aus, Bewohner sieht HV nicht, Cockpit blockiert. Admin-Default: aus, bis erste Hausverwaltung onboarded.'
  ),
  -- Teilfunktionen (nur wirksam wenn Master true)
  (
    'HOUSING_REPORTS',
    false,
    array[]::text[],
    'Teilfunktion Maengelmeldung (municipal_reports mit target_org_id). Nur wirksam wenn HOUSING_MODULE_ENABLED true.'
  ),
  (
    'HOUSING_ANNOUNCEMENTS',
    false,
    array[]::text[],
    'Teilfunktion Hausmitteilungen (municipal_announcements mit target_org_id). Nur wirksam wenn HOUSING_MODULE_ENABLED true.'
  ),
  (
    'HOUSING_DOCUMENTS',
    false,
    array[]::text[],
    'Teilfunktion Dokumenten-Postfach (civic_messages + attachments, target_type=housing). Nur wirksam wenn HOUSING_MODULE_ENABLED true.'
  ),
  (
    'HOUSING_APPOINTMENTS',
    false,
    array[]::text[],
    'Teilfunktion Termine (civic_appointments erweitert). Nur wirksam wenn HOUSING_MODULE_ENABLED true.'
  ),
  -- Free-first / Schatten-Quartier (unabhaengig vom HV-Master, gehoert logisch dazu)
  (
    'HOUSING_SHADOW_QUARTER',
    false,
    array[]::text[],
    'Schatten-Quartier "Offenes Quartier Deutschland" bei Registration ohne Quartier-Wahl. Wenn false: Registration zwingt Quartier-Wahl wie bisher. Seed liegt in Mig 175.'
  )
on conflict (key) do nothing;

commit;
