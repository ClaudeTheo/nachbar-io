-- Migration 154: Heartbeat-Eskalation auf 2 Stufen reduzieren
-- Design-Doc 2026-04-10 Abschnitt 4.5 (Phase 1 Neuausrichtung)
--
-- [DRAFT — NICHT AUSFUEHREN bevor PITR bestaetigt ist]
-- Plan-Prinzip 5: Keine DB-Migration ohne Founder-Go nach Supabase-Pro-Upgrade + PITR-Aktivierung.
--
-- Kontext:
--   Das Code-Refactoring (Task F-1) hat bereits getEscalationStage() und HEARTBEAT_ESCALATION
--   in nachbar-io auf 2 Stufen umgestellt (reminder_24h, alert_48h statt reminder_4h/alert_8h/lotse_12h/urgent_24h).
--   Der Cron-Job wird beim naechsten Lauf bereits versuchen, die neuen Stage-Namen in escalation_events zu schreiben.
--   Diese Migration aktualisiert den CHECK-Constraint, damit das INSERT nicht fehlschlaegt.
--
-- Risiko-Bewertung:
--   - Bei 0 echten Nutzern sind keine Produktivdaten in escalation_events.
--   - Ggf. vorhandene Test-Daten mit alten Stage-Namen werden durch die Migration ungueltig (CHECK-Verletzung).
--   - Schritt 1 (DELETE von Test-Zeilen mit alten Stage-Werten) ist zero-risk, da Test-Daten.
--   - Schritt 2 (CHECK-Update) kann nicht partial angewendet werden — transactional.

BEGIN;

-- Schritt 1: Test-Zeilen mit alten Stage-Werten entfernen
-- Bei 0 echten Nutzern ist das gefahrlos.
DELETE FROM escalation_events
WHERE stage IN ('reminder_4h', 'alert_8h', 'lotse_12h', 'urgent_24h');

-- Schritt 2: CHECK-Constraint ersetzen
ALTER TABLE escalation_events
  DROP CONSTRAINT escalation_events_stage_check;

ALTER TABLE escalation_events
  ADD CONSTRAINT escalation_events_stage_check
  CHECK (stage IN ('reminder_24h', 'alert_48h'));

COMMIT;

-- Verifikation nach Ausfuehrung:
--   SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid = 'public.escalation_events'::regclass
--     AND contype = 'c';
--   Erwartet: escalation_events_stage_check -> CHECK ((stage = ANY (ARRAY['reminder_24h'::text, 'alert_48h'::text])))
