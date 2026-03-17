-- Migration 084: Auto-Answer-Konfiguration pro Angehörigen-Link
-- Design-Ref: docs/plans/2026-03-17-pi-kiosk-welle3-videochat-design.md, Abschnitt 3

ALTER TABLE caregiver_links
  ADD COLUMN auto_answer_allowed boolean NOT NULL DEFAULT false,
  ADD COLUMN auto_answer_start time NOT NULL DEFAULT '08:00',
  ADD COLUMN auto_answer_end time NOT NULL DEFAULT '20:00';

-- Kommentar: Bestehende RLS-Policies auf caregiver_links greifen bereits.
-- Bewohner (resident) sieht alle eigenen Links.
-- Angehöriger (caregiver) sieht nur aktive Links (revoked_at IS NULL).
