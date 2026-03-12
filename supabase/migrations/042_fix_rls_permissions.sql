-- Migration 042: RLS-Policies verschaerfen
-- Behebt zu permissive Policies bei neighbor_invitations und reputation_points

-- 1. neighbor_invitations UPDATE: Nur Einladender oder Admin duerfen aendern
DROP POLICY IF EXISTS "neighbor_invitations_update" ON neighbor_invitations;
CREATE POLICY "neighbor_invitations_update" ON neighbor_invitations
  FOR UPDATE USING (
    inviter_id = auth.uid()
    OR is_admin()
  );

-- 2. reputation_points INSERT: Nur per Service-Role (Backend-API)
--    WITH CHECK (true) entfernen — normaler User soll keine Punkte direkt einfuegen
DROP POLICY IF EXISTS "reputation_points_insert" ON reputation_points;
-- Kein neues INSERT-Policy fuer authentifizierte User.
-- Punkte werden ausschliesslich per Service-Role-Key (API-Routes) vergeben.
-- Service-Role bypassed RLS automatisch.

-- 3. device_tokens: RLS Policies hinzufuegen (bisher fehlend)
--    Zugriff nur fuer Haushaltsmitglieder auf eigene Geraete
CREATE POLICY "device_tokens_select_household" ON device_tokens
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND verified_at IS NOT NULL
    )
    OR is_admin()
  );

CREATE POLICY "device_tokens_insert_household" ON device_tokens
  FOR INSERT WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND verified_at IS NOT NULL
    )
    OR is_admin()
  );

CREATE POLICY "device_tokens_update_household" ON device_tokens
  FOR UPDATE USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND verified_at IS NOT NULL
    )
    OR is_admin()
  );

CREATE POLICY "device_tokens_delete_household" ON device_tokens
  FOR DELETE USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND verified_at IS NOT NULL
    )
    OR is_admin()
  );
