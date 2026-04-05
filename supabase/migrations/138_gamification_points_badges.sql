-- Migration 138: Gamification — Punkte + Abzeichen
-- Design: docs/plans/2026-04-05-gamification-design.md

-- 1. Punkte-Transaktionen (Audit-Trail)
CREATE TABLE IF NOT EXISTS points_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  points INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_points_log_user_id ON points_log(user_id);
CREATE INDEX idx_points_log_user_action_day ON points_log(user_id, action, created_at);

-- 2. Abzeichen pro Nutzer
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_key)
);

CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);

-- 3. Aggregierte Punkte auf users (Cache)
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS points_level INTEGER NOT NULL DEFAULT 1;

-- 4. RLS Policies

-- points_log: Nutzer sieht nur eigene Eintraege
ALTER TABLE points_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "points_log_select_own" ON points_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "points_log_insert_service" ON points_log
  FOR INSERT WITH CHECK (true);

-- user_badges: Eigene + alle sichtbar (Abzeichen sind oeffentlich)
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_badges_select_all" ON user_badges
  FOR SELECT USING (true);

CREATE POLICY "user_badges_insert_service" ON user_badges
  FOR INSERT WITH CHECK (true);
