-- 193_dashboard_ai_quick_access_flag.sql
--
-- ============================================================
-- STATUS: OBSOLET — NICHT AUF PROD APPLIED (Stand 2026-05-11).
-- ============================================================
--
-- Hintergrund obsolet seit Pass-35/Pass-37 (Dashboard-Redesign 2026-05-11):
-- Der KI-Assistent-Schnellzugriff auf dem Dashboard wurde durch
-- "Bekanntmachungen" ersetzt (Commit `7845a99` "swap quick-access slot 4
-- to Bekanntmachungen"). Der Slot existiert in dieser Form nicht mehr;
-- das Flag wuerde keinen sichtbaren Effekt haben.
--
-- Warum das File trotzdem bleibt:
--   1. Die Mig-Nummern-Sequenz reisst nicht (192 → 193 → 194).
--   2. Wenn KI nach §5 Provider-AVV als Hero/FAB-Integration zurueckkommt,
--      kann das Flag-Pattern hier recycled werden.
--   3. ON CONFLICT DO NOTHING macht den Insert idempotent — falls jemand
--      die Mig-Sequenz lokal frisch replayed, entsteht ein ungenutzter
--      Flag-Eintrag (harmlos, kein Code referenziert ihn mehr).
--
-- Original-Hintergrund: Der KI-Assistent-Pfad /companion landet bis zum
-- AVV-Abschluss garantiert auf 503 AI_HELP_DISABLED_MESSAGE
-- (AI_PROVIDER_OFF=true + care_consent ai_onboarding fehlt — siehe
-- memory/project_voice_test_blocked_by_avv.md).
--
-- File-first nach .claude/rules/db-migrations.md.

INSERT INTO feature_flags (key, enabled, description) VALUES
  ('DASHBOARD_AI_QUICK_ACCESS', false,
   'OBSOLET — KI-Slot durch Bekanntmachungen ersetzt; Flag ungenutzt bis KI-Hero/FAB-Rueckkehr')
ON CONFLICT (key) DO NOTHING;
