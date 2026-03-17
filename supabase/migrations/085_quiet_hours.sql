-- Migration 085: Globale Ruhezeiten pro Haushalt
-- Design-Ref: docs/plans/2026-03-17-pi-kiosk-welle3-videochat-design.md, Abschnitt 3

ALTER TABLE households
  ADD COLUMN quiet_hours_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN quiet_hours_start time NOT NULL DEFAULT '22:00',
  ADD COLUMN quiet_hours_end time NOT NULL DEFAULT '07:00';
