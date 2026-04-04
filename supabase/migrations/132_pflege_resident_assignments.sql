-- Migration 132: Personen-basierte Zuweisung fuer Pflegedienste
-- Statt ganzer Quartiere koennen Pflegedienste einzelne Bewohner zugewiesen bekommen.
-- Mehrere Pflegedienste im selben Quartier sehen nur IHRE zugewiesenen Bewohner.

-- 1. Tabelle: pflege_resident_assignments
CREATE TABLE pflege_resident_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id)
);

-- Partial Unique: nur eine aktive Zuweisung pro org+resident
CREATE UNIQUE INDEX idx_pra_active ON pflege_resident_assignments(org_id, resident_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_pra_org ON pflege_resident_assignments(org_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_pra_resident ON pflege_resident_assignments(resident_id) WHERE revoked_at IS NULL;

-- 2. RLS aktivieren
ALTER TABLE pflege_resident_assignments ENABLE ROW LEVEL SECURITY;

-- SELECT: Org-Members der eigenen Organisation sehen Zuweisungen
CREATE POLICY "pra_select_org_member" ON pflege_resident_assignments
  FOR SELECT USING (
    org_id IN (SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid())
  );

-- INSERT: Nur Admins der Organisation
CREATE POLICY "pra_insert_admin" ON pflege_resident_assignments
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT om.org_id FROM org_members om
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
    AND assigned_by = auth.uid()
  );

-- UPDATE: Nur Admins (fuer Revoke via revoked_at)
CREATE POLICY "pra_update_admin" ON pflege_resident_assignments
  FOR UPDATE USING (
    org_id IN (
      SELECT om.org_id FROM org_members om
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

-- 3. Datenmigration: Bestehende Quarter-Zuweisungen → Personen-Zuweisungen
-- Fuer jeden org_member mit assigned_quarters: alle Bewohner dieser Quartiere zuweisen
INSERT INTO pflege_resident_assignments (org_id, resident_id, assigned_by, assigned_at)
SELECT DISTINCT
  om.org_id,
  hm.user_id AS resident_id,
  om.user_id AS assigned_by,
  now()
FROM org_members om
CROSS JOIN LATERAL unnest(om.assigned_quarters) AS q(quarter_id)
JOIN households h ON h.quarter_id = q.quarter_id
JOIN household_members hm ON hm.household_id = h.id
WHERE om.assigned_quarters IS NOT NULL
  AND array_length(om.assigned_quarters, 1) > 0
ON CONFLICT DO NOTHING;
