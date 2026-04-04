-- Migration 126: Civic-Announcements quartiersfaehig machen
-- Damit Meldungen NUR in den richtigen Quartieren ankommen

-- 1. target_quarters Array fuer Announcements
ALTER TABLE civic_announcements
  ADD COLUMN IF NOT EXISTS target_quarters UUID[] DEFAULT '{}';

COMMENT ON COLUMN civic_announcements.target_quarters IS
  'Ziel-Quartiere fuer diese Meldung. Leeres Array = alle Quartiere (Legacy/Global).';

-- 2. assigned_quarters fuer Organisationen
ALTER TABLE civic_organizations
  ADD COLUMN IF NOT EXISTS assigned_quarters UUID[] DEFAULT '{}';

COMMENT ON COLUMN civic_organizations.assigned_quarters IS
  'Quartiere die diese Organisation verwaltet. Fuer Zuordnung bei Meldungserstellung.';

-- 3. Index fuer GIN-Suche auf Arrays
CREATE INDEX IF NOT EXISTS idx_civic_ann_target_quarters
  ON civic_announcements USING GIN (target_quarters);

CREATE INDEX IF NOT EXISTS idx_civic_org_assigned_quarters
  ON civic_organizations USING GIN (assigned_quarters);

-- 4. RLS-Policy fuer civic_announcements anpassen
-- Alte Policy entfernen
DROP POLICY IF EXISTS "civic_announcements_select" ON civic_announcements;

-- Neue quartiersgefilterte Policy:
-- Nutzer sehen Meldungen wenn:
-- a) target_quarters leer (Legacy/Global) ODER
-- b) User's quarter_id in target_quarters[] ODER
-- c) User ist Civic-Member der Organisation (Admins/Editoren sehen eigene immer)
CREATE POLICY "civic_announcements_select" ON civic_announcements
  FOR SELECT USING (
    target_quarters = '{}'
    OR (SELECT get_user_quarter_id()) = ANY(target_quarters)
    OR org_id IN (
      SELECT cm.org_id FROM civic_members cm
      WHERE cm.user_id = auth.uid()
    )
  );

-- 5. warning_cache quartiersfaehig machen
ALTER TABLE warning_cache
  ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES quarters(id);

CREATE INDEX IF NOT EXISTS idx_warning_cache_quarter
  ON warning_cache (quarter_id);

COMMENT ON COLUMN warning_cache.quarter_id IS
  'Quartier-Zuordnung fuer quartiersspezifische Warnungen. NULL = global sichtbar.';

-- 6. RLS fuer warning_cache anpassen
DROP POLICY IF EXISTS "warning_cache_select" ON warning_cache;

CREATE POLICY "warning_cache_select" ON warning_cache
  FOR SELECT USING (
    quarter_id IS NULL
    OR quarter_id = (SELECT get_user_quarter_id())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (is_admin = true OR role = 'admin'))
  );
