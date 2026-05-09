-- Rollback Mig 189 — Strassen-Trim entfernen
-- Backfill (getrimmte Strassennamen) wird NICHT zurueckgespult, weil das die
-- Datenqualitaet wieder verschlechtern wuerde. Nur Trigger + Constraint weg.

BEGIN;

DROP TRIGGER IF EXISTS households_trim_street_name_trigger ON households;
DROP FUNCTION IF EXISTS households_trim_street_name();

ALTER TABLE households
  DROP CONSTRAINT IF EXISTS households_street_name_no_whitespace_drift;

COMMIT;
