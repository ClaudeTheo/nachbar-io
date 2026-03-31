-- Migration 119: Passkey Update-Policy absichern
-- KRITISCH: Die alte Policy "passkey_update_service" erlaubte jedem Nutzer,
-- beliebige Passkey-Credentials zu aendern (USING (true) WITH CHECK (true)).
-- Das bricht die WebAuthn-Sicherheit vollstaendig.
-- Fix: Nur der Besitzer darf seine eigenen Credentials aktualisieren.

-- Unsichere Policy entfernen
DROP POLICY IF EXISTS "passkey_update_service" ON passkey_credentials;

-- Sichere Policy erstellen: Nur eigene Credentials aktualisierbar
CREATE POLICY "passkey_update_own" ON passkey_credentials
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
