-- Migration 20260531120000: users_role_check um Admin-Rollen erweitern
-- Datum: 2026-05-31
-- Kontext: Der admin-auth-Code (nachbar-admin/lib/admin-auth.ts) arbeitet mit den
--          Rollen 'super_admin' und 'quarter_admin', und das Arzt-Vertical mit
--          'doctor_admin'. Der bestehende users_role_check (Migration 175) liess
--          diese Werte NICHT zu -> kein DB-User konnte je super_admin/quarter_admin
--          in der role-Spalte tragen; super_admin-Zugriff funktionierte bisher nur
--          ueber den hartkodierten FOUNDER_USER_IDS-Bypass in admin-auth.ts.
--
--          Dieser Fix bringt DB-Constraint und Code in Einklang. rows_outside_target
--          wurde vorab geprueft = 0, daher kann der neue Constraint VALID sein.
--
-- Mini-Audit (2026-05-31):
-- - RLS/Trigger geprueft: public.users (nur CHECK-Constraint geaendert, KEINE RLS-/
--   Policy-/Trigger-Aenderung, keine Grant-Aenderung). role bleibt durch RLS +
--   admin-auth weiterhin nur per service_role/Founder setzbar.
-- - Findings: 0 CRITICAL/HIGH. Reine Werte-Erweiterung der Positivliste; keine neue
--   Schreibmoeglichkeit fuer Client-Rollen (Selbst-Promotion bleibt durch bestehende
--   RLS/Trigger ausgeschlossen).
-- - Audit-Trail: n/a (Schema-Migration) | Rate-Limit: n/a

-- Idempotent: alten Constraint entfernen, neuen (erweitert + VALID) anlegen.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
    ALTER TABLE public.users DROP CONSTRAINT users_role_check;
  END IF;

  ALTER TABLE public.users
    ADD CONSTRAINT users_role_check
    CHECK (role IN (
      'resident', 'caregiver', 'org_admin', 'org_viewer',
      'doctor', 'doctor_admin', 'senior', 'admin',
      'super_admin', 'quarter_admin'
    ));
END $$;
