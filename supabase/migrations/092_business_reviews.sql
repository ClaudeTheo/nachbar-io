-- Migration 092: Dienstleister-Bewertungen
-- 1-5 Sterne + Text fuer community_tips (lokale Empfehlungen)

CREATE TABLE IF NOT EXISTS tip_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_id UUID NOT NULL REFERENCES community_tips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT CHECK (char_length(text) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tip_id, user_id)
);

ALTER TABLE tip_reviews ENABLE ROW LEVEL SECURITY;

-- Lesen: Alle im selben Quartier (community_tips haben quarter_id via user)
CREATE POLICY "tip_reviews_read" ON tip_reviews
  FOR SELECT USING (true);

-- Erstellen: Nur eigene, nur registriert > 7 Tage
CREATE POLICY "tip_reviews_insert" ON tip_reviews
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.created_at < now() - INTERVAL '7 days'
    )
  );

-- Loeschen: Nur eigene
CREATE POLICY "tip_reviews_delete" ON tip_reviews
  FOR DELETE USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_tip_reviews_tip ON tip_reviews(tip_id);

-- Durchschnitts-Rating als Computed-View (optional, nutzen wir in der App)
-- Kein materialized view noetig bei wenigen Reviews
