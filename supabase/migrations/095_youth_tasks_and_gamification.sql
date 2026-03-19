-- 095_youth_tasks_and_gamification.sql
-- Jugend-Modul: Aufgaben, Punkte, Badges

-- Aufgaben
CREATE TABLE IF NOT EXISTS youth_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter_id UUID NOT NULL REFERENCES quarters(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_by_org UUID REFERENCES organizations(id),
  title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 200),
  description TEXT NOT NULL CHECK (char_length(description) >= 10),
  category TEXT NOT NULL CHECK (category IN ('technik', 'garten', 'begleitung', 'digital', 'event')),
  risk_level TEXT NOT NULL DEFAULT 'niedrig' CHECK (risk_level IN ('niedrig', 'mittel')),
  requires_org BOOLEAN NOT NULL DEFAULT false,
  estimated_minutes INT CHECK (estimated_minutes > 0 AND estimated_minutes <= 480),
  points_reward INT NOT NULL DEFAULT 20 CHECK (points_reward >= 1 AND points_reward <= 200),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'open', 'accepted', 'completed', 'cancelled')),
  accepted_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  confirmed_by_creator BOOLEAN NOT NULL DEFAULT false,
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_youth_tasks_quarter ON youth_tasks(quarter_id);
CREATE INDEX idx_youth_tasks_status ON youth_tasks(status);
CREATE INDEX idx_youth_tasks_category ON youth_tasks(category);
CREATE INDEX idx_youth_tasks_accepted_by ON youth_tasks(accepted_by);

-- RLS
ALTER TABLE youth_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY youth_tasks_select_quarter ON youth_tasks
  FOR SELECT USING (
    status = 'open'
    OR created_by = auth.uid()
    OR accepted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.user_id = auth.uid()
        AND quarter_id = ANY(om.assigned_quarters)
    )
  );

CREATE POLICY youth_tasks_insert_resident ON youth_tasks
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY youth_tasks_update_involved ON youth_tasks
  FOR UPDATE USING (
    created_by = auth.uid()
    OR accepted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.user_id = auth.uid()
        AND om.role = 'admin'
        AND quarter_id = ANY(om.assigned_quarters)
    )
  );

-- Badges
CREATE TABLE IF NOT EXISTS youth_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT,
  condition_type TEXT NOT NULL CHECK (condition_type IN ('task_count', 'category_count', 'points_total', 'streak', 'manual')),
  condition_value JSONB NOT NULL DEFAULT '{}',
  min_access_level TEXT NOT NULL DEFAULT 'basis' CHECK (min_access_level IN ('basis', 'erweitert', 'freigeschaltet')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Verdiente Badges
CREATE TABLE IF NOT EXISTS youth_earned_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES youth_badges(id),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE youth_earned_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY youth_earned_badges_select_own ON youth_earned_badges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY youth_earned_badges_insert_service ON youth_earned_badges
  FOR INSERT WITH CHECK (true);  -- service_role

-- Punkte-Ledger (append-only)
CREATE TABLE IF NOT EXISTS youth_points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('task', 'challenge', 'badge', 'bonus', 'redemption')),
  source_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_youth_points_user ON youth_points_ledger(user_id);
CREATE INDEX idx_youth_points_created ON youth_points_ledger(created_at);

ALTER TABLE youth_points_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY youth_points_select_own ON youth_points_ledger
  FOR SELECT USING (auth.uid() = user_id);

-- Moderations-Log
CREATE TABLE IF NOT EXISTS youth_moderation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('task', 'message', 'post', 'user')),
  target_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'flagged', 'suspended', 'restored')),
  reason TEXT,
  moderator_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_youth_moderation_target ON youth_moderation_log(target_type, target_id);

ALTER TABLE youth_moderation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY youth_moderation_select_org ON youth_moderation_log
  FOR SELECT USING (
    moderator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

-- 5 Start-Badges einfuegen
INSERT INTO youth_badges (slug, title, description, condition_type, condition_value, min_access_level) VALUES
  ('quartiers-neuling', 'Quartiers-Neuling', 'Willkommen! Du hast dich angemeldet.', 'manual', '{}', 'basis'),
  ('erster-einsatz', 'Erster Einsatz', 'Du hast deine erste Aufgabe erledigt!', 'task_count', '{"count": 1}', 'erweitert'),
  ('technik-held', 'Technik-Held', '5 Technik-Aufgaben gemeistert.', 'category_count', '{"category": "technik", "count": 5}', 'erweitert'),
  ('nachbar-profi', 'Nachbar-Profi', '25 Aufgaben erledigt — echte Nachbarschaftshilfe!', 'task_count', '{"count": 25}', 'erweitert'),
  ('quartiers-held', 'Quartiers-Held', '100 Aufgaben und 1000 Punkte — du bist eine Legende!', 'points_total', '{"points": 1000, "tasks": 100}', 'freigeschaltet')
ON CONFLICT (slug) DO NOTHING;
