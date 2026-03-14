-- Migration 059: Quartier-Lifecycle Automation
-- Automatische Status-Uebergaenge bei neuen Household-Members

CREATE OR REPLACE FUNCTION check_quarter_lifecycle()
RETURNS TRIGGER AS $$
DECLARE
  q_id UUID;
  verified_count INTEGER;
  q_status TEXT;
BEGIN
  -- Quartier des neuen Household-Members finden
  SELECT h.quarter_id INTO q_id
    FROM households h WHERE h.id = NEW.household_id;
  IF q_id IS NULL THEN RETURN NEW; END IF;

  -- Verifizierte Haushalte zaehlen
  SELECT COUNT(DISTINCT hm.household_id) INTO verified_count
    FROM household_members hm
    JOIN households h ON h.id = hm.household_id
    WHERE h.quarter_id = q_id AND hm.verified_at IS NOT NULL;

  SELECT status INTO q_status FROM quarters WHERE id = q_id;

  -- Statusuebergaenge gemaess Strategie-Dokument
  -- seeding → activating: 5 verifizierte Haushalte
  IF q_status = 'seeding' AND verified_count >= 5 THEN
    UPDATE quarters
    SET status = 'activating', household_count = verified_count
    WHERE id = q_id;
  -- activating → active: 8 verifizierte Haushalte
  ELSIF q_status = 'activating' AND verified_count >= 8 THEN
    UPDATE quarters
    SET status = 'active', activated_at = NOW(), household_count = verified_count
    WHERE id = q_id;
  ELSE
    -- household_count immer aktualisieren
    UPDATE quarters SET household_count = verified_count WHERE id = q_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger nach INSERT oder UPDATE auf household_members
DROP TRIGGER IF EXISTS trg_quarter_lifecycle ON household_members;
CREATE TRIGGER trg_quarter_lifecycle
  AFTER INSERT OR UPDATE ON household_members
  FOR EACH ROW EXECUTE FUNCTION check_quarter_lifecycle();
