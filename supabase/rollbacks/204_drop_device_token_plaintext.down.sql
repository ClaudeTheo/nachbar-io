-- ============================================================
-- Down-Migration 204: Struktur der Klartext-Spalte wiederherstellen
--
-- ACHTUNG: Die Klartext-Token-WERTE sind nach dem DROP unwiederbringlich
-- (gewollt). Dieses Down stellt nur die Spaltenstruktur von Mig 033 wieder
-- her; bestehende Zeilen erhalten via DEFAULT neue Zufallstokens, die zu
-- keinem Geraet passen. Geraete muessen danach neu provisioniert werden.
-- ============================================================

ALTER TABLE device_tokens
  ADD COLUMN IF NOT EXISTS token TEXT UNIQUE NOT NULL
  DEFAULT encode(gen_random_bytes(32), 'hex');

CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens(token);

CREATE INDEX IF NOT EXISTS idx_device_tokens_hash ON device_tokens(token_hash);
DROP INDEX IF EXISTS idx_device_tokens_hash_unique;

ALTER TABLE device_tokens ALTER COLUMN token_hash DROP NOT NULL;

COMMENT ON COLUMN device_tokens.token_hash IS
  'SHA-256 Hash des Device-Tokens (Klartext wird nach Uebergangsphase entfernt)';
