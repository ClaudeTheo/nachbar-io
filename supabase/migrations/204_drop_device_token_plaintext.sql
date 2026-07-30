-- ============================================================
-- Migration 204: K7-Abschluss — Klartext-Spalte device_tokens.token entfernen
--
-- Kontext: Mig 041 fuehrte token_hash ein und kuendigte den DROP der
-- Klartext-Spalte "nach Firmware-Update" an; der DROP wurde nie ausgefuehrt.
-- Die API (lib/device/auth.ts) arbeitet seit diesem Stand ausschliesslich
-- mit token_hash; der Klartext-Fallback im Code ist entfernt.
--
-- Prod-Vorabcheck 2026-07-30 (read-only): 2 Zeilen, beide token_hash
-- konsistent (encode(digest(token,'sha256'),'hex') = token_hash), 0 NULL.
--
-- Neue Geraete nach dieser Migration anlegen (Founder/Admin per SQL):
--   -- Klartext-Token einmalig ausserhalb der DB erzeugen, z.B.:
--   --   openssl rand -hex 32
--   -- dann nur den Hash speichern:
--   INSERT INTO device_tokens (household_id, device_name, token_hash)
--   VALUES ('<household-uuid>', 'reTerminal E1001',
--           encode(digest('<klartext-token>', 'sha256'), 'hex'));
--   -- Klartext-Token nur ins Geraet (src/config.h), nie in die DB.
--
-- Prod-Apply: NUR Founder-Hand (Reihenfolge nach Mig 203).
-- ============================================================

-- 1. Sicherheits-Backfill (idempotent; erwartet 0 betroffene Zeilen)
UPDATE device_tokens
SET token_hash = encode(digest(token, 'sha256'), 'hex')
WHERE token IS NOT NULL AND token_hash IS NULL;

-- 2. token_hash wird Pflicht und eindeutig (Lookup nutzt .single())
ALTER TABLE device_tokens ALTER COLUMN token_hash SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_tokens_hash_unique
  ON device_tokens(token_hash);

-- 3. Klartext-Spalte und ihren Index entfernen
DROP INDEX IF EXISTS idx_device_tokens_token;
ALTER TABLE device_tokens DROP COLUMN IF EXISTS token;

-- 4. Alter (nicht-eindeutiger) Hash-Index ist durch den Unique-Index ersetzt
DROP INDEX IF EXISTS idx_device_tokens_hash;

COMMENT ON COLUMN device_tokens.token_hash IS
  'SHA-256 Hash des Device-Tokens (einzige gespeicherte Form; Klartext entfernt mit Mig 204)';
