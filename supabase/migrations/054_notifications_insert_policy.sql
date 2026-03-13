-- Migration 054: INSERT Policy fuer Notifications
-- Erlaubt authentifizierten Nutzern, Notifications fuer andere Nutzer zu erstellen
-- (z.B. wenn Thomas eine Nachricht an Tobias sendet, wird eine Notification fuer Tobias erstellt)

-- Jeder authentifizierte Nutzer darf Notifications erstellen
-- (Notifications werden vom Sender fuer den Empfaenger erstellt)
CREATE POLICY "notif_insert_authenticated" ON notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
