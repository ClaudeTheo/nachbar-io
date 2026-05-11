-- 193_dashboard_ai_quick_access_flag.sql
-- Nachbar.io — Feature-Flag fuer den KI-Assistent-Schnellzugriff auf dem Dashboard.
--
-- Hintergrund: Der KI-Assistent-Pfad /companion landet bis zum AVV-Abschluss
-- garantiert auf 503 AI_HELP_DISABLED_MESSAGE (AI_PROVIDER_OFF=true +
-- care_consent ai_onboarding fehlt — siehe memory/project_voice_test_blocked_by_avv.md).
-- Damit Senior-User nicht auf einen toten Schnellzugriff klicken, blenden wir
-- den Knopf hinter einen Feature-Flag. Default enabled=false; Founder schaltet
-- ihn ein, sobald §5 Provider-AVV durch ist.
--
-- File-first nach .claude/rules/db-migrations.md. Apply auf Prod nur mit
-- Founder-Go.

INSERT INTO feature_flags (key, enabled, description) VALUES
  ('DASHBOARD_AI_QUICK_ACCESS', false,
   'KI-Assistent-Schnellzugriff auf Dashboard (default off bis §5 AVV durch)')
ON CONFLICT (key) DO NOTHING;
