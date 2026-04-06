-- Migration 147: Civic Postfach Threading
-- Drei Spalten fuer bidirektionale Konversation

-- Schritt 1: Spalten anlegen (nullable, ohne FK)
ALTER TABLE civic_messages
  ADD COLUMN thread_id UUID,
  ADD COLUMN direction TEXT NOT NULL DEFAULT 'citizen_to_staff'
    CHECK (direction IN ('citizen_to_staff', 'staff_to_citizen')),
  ADD COLUMN sender_user_id UUID;

-- Schritt 2: Bestehende Nachrichten backfillen
UPDATE civic_messages
  SET thread_id = id,
      sender_user_id = citizen_user_id;

-- Schritt 3: NOT NULL erzwingen
ALTER TABLE civic_messages
  ALTER COLUMN thread_id SET NOT NULL,
  ALTER COLUMN sender_user_id SET NOT NULL;

-- Schritt 5: FK-Constraints hinzufuegen
ALTER TABLE civic_messages
  ADD CONSTRAINT civic_messages_thread_id_fkey
    FOREIGN KEY (thread_id) REFERENCES civic_messages(id);
ALTER TABLE civic_messages
  ADD CONSTRAINT civic_messages_sender_user_id_fkey
    FOREIGN KEY (sender_user_id) REFERENCES auth.users(id);

-- Schritt 6: Index
CREATE INDEX idx_civic_messages_thread ON civic_messages(thread_id);
