-- Migration: Senior-Lesezugriff auf Haushalts-Fotos/-Zettel (Welle SB, SB-1)
-- ------------------------------------------------------------------
-- Bisher (Mig 083) lesen kiosk_photos/kiosk_reminders nur:
--   * Caregiver des Bewohners (via caregiver_links, revoked_at IS NULL), ODER
--   * der Uploader (kiosk_photos.uploaded_by) bzw. Ersteller (kiosk_reminders.created_by).
-- Ein verifiziertes Haushaltsmitglied (Senior/Resident) kann seine EIGENEN
-- Haushaltsdaten damit NICHT lesen — genau das braucht der Senior-Bildschirm.
--
-- Diese Migration ergaenzt je eine zusaetzliche SELECT-Policy. Policies sind in
-- Postgres permissive -> die neue Policy wird mit den 083-Policies per OR
-- verknuepft (Lese-Erweiterung, keine Einschraenkung). KEINE Schreibrechte:
-- INSERT/UPDATE/DELETE bleiben unveraendert. Die "Gesehen"-Quittung (acknowledged_at)
-- laeuft bewusst NICHT ueber RLS, sondern ueber die SB-4-Route (Admin-Client mit
-- eigenen Checks), weil RLS keine Spalten-Einschraenkung auf UPDATE erlaubt.
--
-- File-first: NICHT auf Prod angewendet ohne separaten Founder-Go.

BEGIN;

-- Fotos: nur sichtbare Fotos (visible = true) des eigenen, verifizierten Haushalts.
DROP POLICY IF EXISTS kiosk_photos_select_household_member ON kiosk_photos;
CREATE POLICY kiosk_photos_select_household_member ON kiosk_photos
  FOR SELECT USING (
    visible = true
    AND household_id IN (
      SELECT hm.household_id FROM household_members hm
      WHERE hm.user_id = auth.uid() AND hm.verified_at IS NOT NULL
    )
  );
COMMENT ON POLICY kiosk_photos_select_household_member ON kiosk_photos IS
  'Welle SB-1: verifizierte Haushaltsmitglieder lesen sichtbare Familienfotos ihres Haushalts (Senior-Bildschirm).';

-- Erinnerungen/Sticky-Notes des eigenen, verifizierten Haushalts.
DROP POLICY IF EXISTS kiosk_reminders_select_household_member ON kiosk_reminders;
CREATE POLICY kiosk_reminders_select_household_member ON kiosk_reminders
  FOR SELECT USING (
    household_id IN (
      SELECT hm.household_id FROM household_members hm
      WHERE hm.user_id = auth.uid() AND hm.verified_at IS NOT NULL
    )
  );
COMMENT ON POLICY kiosk_reminders_select_household_member ON kiosk_reminders IS
  'Welle SB-1: verifizierte Haushaltsmitglieder lesen Erinnerungen/Sticky-Notes ihres Haushalts (Senior-Bildschirm).';

COMMIT;
