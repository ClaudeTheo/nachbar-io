-- Migration 091: Board-Erweiterungen — Bilder + Kommentare
-- Bild-URL fuer Board-Posts + Kommentar-System

-- Bild-URL fuer help_requests (Board-Posts, Marketplace etc.)
ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Kommentar-Tabelle fuer Board-Posts
CREATE TABLE IF NOT EXISTS board_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (char_length(text) >= 1 AND char_length(text) <= 300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE board_comments ENABLE ROW LEVEL SECURITY;

-- Lesen: Alle im selben Quartier
CREATE POLICY "board_comments_read" ON board_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM help_requests hr
      JOIN households h ON h.quarter_id = hr.quarter_id
      JOIN household_members hm ON hm.household_id = h.id
      WHERE hr.id = board_comments.post_id
      AND hm.user_id = auth.uid()
    )
  );

-- Erstellen: Nur eigene Kommentare
CREATE POLICY "board_comments_insert" ON board_comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Loeschen: Nur eigene
CREATE POLICY "board_comments_delete" ON board_comments
  FOR DELETE USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_board_comments_post ON board_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_board_comments_created ON board_comments(post_id, created_at);
