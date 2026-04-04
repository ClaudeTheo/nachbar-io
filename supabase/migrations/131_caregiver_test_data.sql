-- 131_caregiver_test_data.sql
-- Nachbar.io — Caregiver-Testdaten: Sandra (Caregiver) → Helga (Senior)
-- Erstellt Link + Invite-Code fuer Browser-Tests

-- Sandra als Caregiver von Helga verknuepfen (nur wenn noch nicht vorhanden)
DO $$
DECLARE
  v_helga_id uuid;
  v_sandra_id uuid;
BEGIN
  -- User-IDs nachschlagen
  SELECT id INTO v_helga_id FROM auth.users WHERE email = 'helga.brunner@nachbar-test.de';
  SELECT id INTO v_sandra_id FROM auth.users WHERE email = 'sandra.keller@nachbar-test.de';

  IF v_helga_id IS NULL OR v_sandra_id IS NULL THEN
    RAISE NOTICE 'Test-User nicht gefunden — ueberspringe Caregiver-Testdaten';
    RETURN;
  END IF;

  -- Einladungs-Code (bereits eingeloest) fuer Audit-Trail
  INSERT INTO caregiver_invites (resident_id, invite_code, expires_at, used_at, used_by)
  VALUES (v_helga_id, 'TEST1234', now() + interval '24 hours', now(), v_sandra_id)
  ON CONFLICT (invite_code) DO NOTHING;

  -- Caregiver-Link: Sandra sieht Helgas Heartbeat + Check-in Status
  INSERT INTO caregiver_links (resident_id, caregiver_id, relationship_type, heartbeat_visible)
  VALUES (v_helga_id, v_sandra_id, 'child', true)
  ON CONFLICT (resident_id, caregiver_id) DO NOTHING;

  -- Frischer Invite-Code fuer zukuenftige Browser-Tests (unbenutzt, 7 Tage gueltig)
  INSERT INTO caregiver_invites (resident_id, invite_code, expires_at)
  VALUES (v_helga_id, 'HELGA999', now() + interval '7 days')
  ON CONFLICT (invite_code) DO NOTHING;

  RAISE NOTICE 'Caregiver-Testdaten erstellt: Sandra → Helga (child, heartbeat sichtbar)';
END $$;
