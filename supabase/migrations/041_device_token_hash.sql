-- ============================================================
-- Migration 041: Device-Token Hashing (SHA-256)
--
-- Behebt K7: Tokens werden als SHA-256 Hash gespeichert.
-- Bei DB-Leak sind rohe Tokens nicht direkt nutzbar.
-- ============================================================

-- pgcrypto fuer digest() aktivieren (falls nicht vorhanden)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Neue Spalte fuer den Hash
ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS token_hash TEXT;

-- 2. Bestehende Tokens hashen
UPDATE device_tokens
SET token_hash = encode(digest(token, 'sha256'), 'hex')
WHERE token IS NOT NULL AND token_hash IS NULL;

-- 3. Index fuer Hash-Lookup (ersetzt den alten Token-Index)
CREATE INDEX IF NOT EXISTS idx_device_tokens_hash ON device_tokens(token_hash);

-- 4. Alten Klartext-Token NICHT sofort loeschen (Uebergangsphase)
--    Nach Firmware-Update + bestaetiger Funktion:
--    ALTER TABLE device_tokens DROP COLUMN token;
--    DROP INDEX IF EXISTS idx_device_tokens_token;

COMMENT ON COLUMN device_tokens.token_hash IS 'SHA-256 Hash des Device-Tokens (Klartext wird nach Uebergangsphase entfernt)';
