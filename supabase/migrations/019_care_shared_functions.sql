-- 019_care_shared_functions.sql
-- Gemeinsame Funktionen fuer das Care-Modul

-- updated_at Trigger-Funktion (fuer alle care_* Tabellen mit updated_at)
CREATE OR REPLACE FUNCTION care_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Prueft ob User verifizierter Helfer fuer einen Senior ist
CREATE OR REPLACE FUNCTION is_care_helper_for(p_senior_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM care_helpers
    WHERE user_id = auth.uid()
    AND p_senior_id = ANY(assigned_seniors)
    AND verification_status = 'verified'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Prueft Helfer-Rolle fuer einen Senior
CREATE OR REPLACE FUNCTION care_helper_role(p_senior_id uuid)
RETURNS text AS $$
  SELECT role FROM care_helpers
  WHERE user_id = auth.uid()
  AND p_senior_id = ANY(assigned_seniors)
  AND verification_status = 'verified'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Verhindert Modifikation des Audit-Logs
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'care_audit_log: UPDATE und DELETE sind nicht erlaubt (revisionssicher)';
END;
$$ LANGUAGE plpgsql;
