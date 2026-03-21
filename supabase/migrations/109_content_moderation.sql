-- Migration 109: Content-Moderation-System (Apple Guideline 1.2 + 1.3)
-- Erstellt Tabellen fuer Nutzer-Meldungen, Blockierungen, KI-Moderation,
-- Admin-Aktionen und Kanal-Konfiguration.

-- ============================================================
-- 1. content_reports — Nutzer-Meldungen mit gewichteten Scores
-- ============================================================
CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id),
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'marketplace', 'chat', 'comment', 'profile')),
  content_id UUID NOT NULL,
  reason_category TEXT NOT NULL CHECK (reason_category IN ('spam', 'harassment', 'hate', 'scam', 'inappropriate', 'wrong_category', 'other')),
  reason_text TEXT,
  report_weight NUMERIC(4,2) DEFAULT 1.0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE content_reports IS 'Nutzer-Meldungen fuer Content-Moderation (Apple 1.2)';

-- ============================================================
-- 2. user_blocks — Stummschalten / Blockieren / Sicherheitsblock
-- ============================================================
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  block_level TEXT DEFAULT 'mute' CHECK (block_level IN ('mute', 'block', 'safety')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

COMMENT ON TABLE user_blocks IS 'Nutzer-Blockierungen (mute/block/safety)';

-- ============================================================
-- 3. moderation_queue — KI-Moderations-Queue
-- ============================================================
CREATE TABLE IF NOT EXISTS moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('board', 'marketplace', 'chat', 'comment', 'profile')),
  ai_score TEXT CHECK (ai_score IN ('green', 'yellow', 'red')),
  ai_reason TEXT,
  ai_confidence NUMERIC(3,2),
  weighted_report_score NUMERIC(6,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE moderation_queue IS 'KI-Moderations-Queue fuer automatische Inhaltspruefung';

-- ============================================================
-- 4. moderation_actions — Admin-Aktionen (Warnung, Sperre etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('warn', 'mute', 'temp_ban', 'perm_ban')),
  reason TEXT NOT NULL,
  duration INTERVAL,
  expires_at TIMESTAMPTZ,
  appeal_status TEXT DEFAULT 'none' CHECK (appeal_status IN ('none', 'pending', 'approved', 'denied')),
  appeal_text TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE moderation_actions IS 'Admin-Moderationsaktionen mit Einspruchsmoeglichkeit';

-- ============================================================
-- 5. moderation_config — Kanal-spezifische Konfiguration
-- ============================================================
CREATE TABLE IF NOT EXISTS moderation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT UNIQUE NOT NULL CHECK (channel IN ('board', 'marketplace', 'chat', 'comment', 'profile')),
  yellow_action TEXT DEFAULT 'visible_flagged',
  red_action TEXT DEFAULT 'quarantine',
  auto_hide_threshold NUMERIC(4,2) DEFAULT 4.0,
  auto_ban_threshold NUMERIC(4,2) DEFAULT 8.0,
  max_reports_per_hour INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE moderation_config IS 'Kanal-spezifische Moderationskonfiguration';

-- ============================================================
-- Indizes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_content_reports_content ON content_reports(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON moderation_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_moderation_actions_user ON moderation_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_active ON moderation_actions(user_id, expires_at);

-- ============================================================
-- Row-Level Security aktivieren
-- ============================================================
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_config ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies: content_reports
-- ============================================================
-- Nutzer koennen eigene Meldungen erstellen
CREATE POLICY "content_reports_insert_own" ON content_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Nutzer koennen eigene Meldungen sehen
CREATE POLICY "content_reports_select_own" ON content_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Admins haben vollen Zugriff
CREATE POLICY "content_reports_admin_all" ON content_reports
  FOR ALL USING (
    is_admin()
  );

-- ============================================================
-- RLS Policies: user_blocks
-- ============================================================
-- Nutzer koennen eigene Blockierungen verwalten
CREATE POLICY "user_blocks_manage_own" ON user_blocks
  FOR ALL USING (auth.uid() = blocker_id);

-- Nutzer koennen sehen, ob sie blockiert wurden
CREATE POLICY "user_blocks_see_blocked" ON user_blocks
  FOR SELECT USING (auth.uid() = blocked_id);

-- ============================================================
-- RLS Policies: moderation_queue
-- ============================================================
-- Nur Admins haben Zugriff
CREATE POLICY "moderation_queue_admin_all" ON moderation_queue
  FOR ALL USING (
    is_admin()
  );

-- ============================================================
-- RLS Policies: moderation_actions
-- ============================================================
-- Admins haben vollen Zugriff
CREATE POLICY "moderation_actions_admin_all" ON moderation_actions
  FOR ALL USING (
    is_admin()
  );

-- Nutzer koennen eigene Aktionen sehen (z.B. Warnungen, Sperren)
CREATE POLICY "moderation_actions_select_own" ON moderation_actions
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- RLS Policies: moderation_config
-- ============================================================
-- Nur Admins haben Zugriff
CREATE POLICY "moderation_config_admin_all" ON moderation_config
  FOR ALL USING (
    is_admin()
  );

-- ============================================================
-- Initiale Kanal-Konfiguration
-- ============================================================
INSERT INTO moderation_config (channel, yellow_action, red_action) VALUES
  ('board', 'visible_flagged', 'quarantine'),
  ('marketplace', 'restricted_visible', 'quarantine'),
  ('chat', 'throttled', 'blocked'),
  ('comment', 'visible_flagged', 'quarantine'),
  ('profile', 'pending_review', 'reverted')
ON CONFLICT DO NOTHING;
