-- Migration 121: RLS-Policies fuer youth_badges
-- youth_badges ist eine Referenztabelle (Badge-Definitionen),
-- die vom System befuellt wird. Alle authentifizierten Nutzer
-- duerfen Badges lesen, aber nur service_role darf schreiben/loeschen.

-- RLS aktivieren
ALTER TABLE youth_badges ENABLE ROW LEVEL SECURITY;

-- SELECT: Alle authentifizierten Nutzer duerfen Badge-Definitionen lesen
CREATE POLICY "youth_badges_select_authenticated"
  ON youth_badges
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Nur service_role (System vergibt Badges)
CREATE POLICY "youth_badges_insert_service_only"
  ON youth_badges
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- DELETE: Nur service_role
CREATE POLICY "youth_badges_delete_service_only"
  ON youth_badges
  FOR DELETE
  TO service_role
  USING (true);
