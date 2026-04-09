-- Migration 152: Hash-Chain fuer org_audit_log (Audit-Item T04)
-- Zweck: Manipulationssicherer Audit-Trail via SHA-256-Verkettung
-- Jeder neue Eintrag speichert den Hash des vorherigen Eintrags
-- Eine nachtraegliche Aenderung wuerde die Kette brechen

-- 1. Spalte fuer den Hash des vorherigen Eintrags
ALTER TABLE org_audit_log ADD COLUMN prev_hash TEXT;

-- 2. Trigger-Funktion: Berechnet SHA-256 des vorigen Eintrags
CREATE OR REPLACE FUNCTION audit_hash_chain()
RETURNS TRIGGER AS $$
DECLARE
  last_row RECORD;
  hash_input TEXT;
BEGIN
  -- Letzten Eintrag finden (nach created_at, dann id fuer Gleichzeitigkeit)
  SELECT id, prev_hash, action, user_id, created_at
  INTO last_row
  FROM org_audit_log
  WHERE id != NEW.id
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  IF last_row IS NULL THEN
    -- Erster Eintrag: Genesis-Hash
    NEW.prev_hash := encode(digest('GENESIS', 'sha256'), 'hex');
  ELSE
    -- Hash aus: prev_hash + id + action + user_id + created_at
    hash_input := COALESCE(last_row.prev_hash, '')
      || '|' || last_row.id::text
      || '|' || last_row.action
      || '|' || COALESCE(last_row.user_id::text, '')
      || '|' || last_row.created_at::text;
    NEW.prev_hash := encode(digest(hash_input, 'sha256'), 'hex');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger auf INSERT (BEFORE, damit prev_hash beim Schreiben gesetzt wird)
CREATE TRIGGER trg_audit_hash_chain
  BEFORE INSERT ON org_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION audit_hash_chain();

-- 4. pgcrypto Extension muss aktiv sein (fuer digest())
-- Supabase hat pgcrypto standardmaessig aktiviert
-- Falls nicht: CREATE EXTENSION IF NOT EXISTS pgcrypto;
