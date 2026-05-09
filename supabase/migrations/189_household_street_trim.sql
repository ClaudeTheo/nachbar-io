-- Mig 189 — Strassen-Trim auf households.street_name
-- Hintergrund: Super-Admin-Report 2026-05-09 zeigte, dass `Purkersdorferstrasse `
-- (mit Trailing-Space) als eigene Strasse gezaehlt wurde. UNIQUE(quarter_id,
-- street_name, house_number) liess das durch, weil Trim nirgends erzwungen war.
--
-- Diese Migration:
-- 1) Detected vor Backfill UNIQUE-Konflikte (RAISE EXCEPTION mit Sample)
-- 2) Trimmt bestehende Strassennamen
-- 3) Setzt einen BEFORE-INSERT/UPDATE-Trigger, der weiter trimmt
-- 4) Setzt einen CHECK-Constraint, der kuenftige Whitespace-Eintraege blockt
--
-- Kein DELETE, kein MERGE. Wenn UNIQUE-Konflikte auftreten, muss der Founder
-- vor Apply manuell entscheiden, welche Variante bleibt.

BEGIN;

-- 1) UNIQUE-Konflikte detecten — wenn vorhanden: ABBRUCH mit Sample
DO $$
DECLARE
  conflict_sample TEXT;
  conflict_count INTEGER;
BEGIN
  SELECT
    COUNT(*),
    string_agg(
      format('quarter=%s street="%s" trimmed="%s" haus=%s rows=%s',
             quarter_id, street_name, trim_value, house_number, dup_count),
      E'\n'
    )
  INTO conflict_count, conflict_sample
  FROM (
    SELECT
      quarter_id,
      TRIM(street_name) AS trim_value,
      house_number,
      MAX(street_name) AS street_name,
      COUNT(*) AS dup_count
    FROM households
    GROUP BY quarter_id, TRIM(street_name), house_number
    HAVING COUNT(*) > 1
    LIMIT 20
  ) AS conflicts;

  IF conflict_count > 0 THEN
    RAISE EXCEPTION
      'Mig 189 abgebrochen: % UNIQUE-Konflikte beim Trim. Founder muss manuell entscheiden, welche Variante bleibt. Sample:\n%',
      conflict_count, conflict_sample;
  END IF;
END $$;

-- 2) Backfill: bestehende Strassennamen trimmen
UPDATE households
SET street_name = TRIM(street_name)
WHERE street_name IS NOT NULL
  AND street_name <> TRIM(street_name);

-- 3) Trigger fuer kuenftige Inserts/Updates
CREATE OR REPLACE FUNCTION households_trim_street_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.street_name IS NOT NULL THEN
    NEW.street_name := TRIM(NEW.street_name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS households_trim_street_name_trigger ON households;
CREATE TRIGGER households_trim_street_name_trigger
  BEFORE INSERT OR UPDATE OF street_name ON households
  FOR EACH ROW
  EXECUTE FUNCTION households_trim_street_name();

-- 4) Constraint: kuenftige Whitespace-Eintraege werden hart blockiert
ALTER TABLE households
  DROP CONSTRAINT IF EXISTS households_street_name_no_whitespace_drift;
ALTER TABLE households
  ADD CONSTRAINT households_street_name_no_whitespace_drift
  CHECK (street_name IS NULL OR street_name = TRIM(street_name));

COMMIT;
