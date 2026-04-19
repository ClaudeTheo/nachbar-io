-- Migration 170: Neue Gesundheits-Feature-Flags
-- Task: Stufe-3-Plan (docs/plans/2026-04-19-gesundheits-flags-stufe-3.md)
-- Kontext: Admin soll Medikamente + Aerzte ueber Admin-Dashboard
--          aktivieren koennen. Beide Flags Default OFF.
-- Rueckbau: 170_health_feature_flags.down.sql
-- Idempotent: ja (ON CONFLICT DO NOTHING).
-- Bestehende Gesundheits-Flags (APPOINTMENTS_ENABLED, VIDEO_CONSULTATION,
-- GDT_ENABLED, HEARTBEAT_ENABLED) werden hier nicht angefasst.

begin;

insert into public.feature_flags (key, enabled, required_plans, description)
values
  (
    'MEDICATIONS_ENABLED',
    false,
    array['plus','pro']::text[],
    'Medikamentenplan (Care) - Plus-Feature'
  ),
  (
    'DOCTORS_ENABLED',
    false,
    array[]::text[],
    'Aerzte-Verzeichnis (Care) - fuer alle Pakete'
  )
on conflict (key) do nothing;

commit;
