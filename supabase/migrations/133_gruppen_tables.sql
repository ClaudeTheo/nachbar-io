-- Migration 133: Gruppen / Interessengruppen
-- 5 Tabellen + RLS + Indices
-- Bereits deployed via Supabase MCP (2026-04-05)

CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter_id UUID NOT NULL REFERENCES quarters(id),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 3 AND 60),
  description TEXT CHECK (char_length(description) <= 500),
  category TEXT NOT NULL DEFAULT 'sonstiges'
    CHECK (category IN ('nachbarschaft','sport','garten','kinder','senioren','kultur','ehrenamt','sonstiges')),
  type TEXT NOT NULL DEFAULT 'open'
    CHECK (type IN ('open', 'closed', 'official')),
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  member_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('founder', 'admin', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'removed')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE TABLE group_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE group_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES group_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE group_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  muted BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (group_id, user_id)
);

-- Indices
CREATE INDEX idx_groups_quarter ON groups(quarter_id);
CREATE INDEX idx_group_members_user ON group_members(user_id) WHERE status = 'active';
CREATE INDEX idx_group_members_group ON group_members(group_id) WHERE status = 'active';
CREATE INDEX idx_group_posts_group ON group_posts(group_id, created_at DESC);
CREATE INDEX idx_group_post_comments_post ON group_post_comments(post_id, created_at);

-- RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_notification_settings ENABLE ROW LEVEL SECURITY;

-- Policies (gekuerzt, vollstaendig in Supabase deployed)
-- groups: SELECT quarter-scoped, INSERT creator_id=auth.uid(), UPDATE admin/founder, DELETE founder
-- group_members: SELECT member+open, INSERT self, UPDATE self+admin
-- group_posts: SELECT member+open, INSERT member, DELETE author
-- group_post_comments: SELECT via posts, INSERT member, DELETE author
-- group_notification_settings: ALL own
