-- Migration 137: Geschlossene Gruppen — Posts nur fuer Mitglieder
-- Deployed via Supabase MCP (2026-04-05)

DROP POLICY IF EXISTS "gm_select" ON group_members;
CREATE POLICY "gm_select" ON group_members FOR SELECT USING (
  user_id = auth.uid()
  OR group_id IN (
    SELECT id FROM groups WHERE type IN ('open', 'official') AND quarter_id IN (
      SELECT h.quarter_id FROM household_members hm
      JOIN households h ON h.id = hm.household_id
      WHERE hm.user_id = auth.uid() AND hm.verified_at IS NOT NULL
    )
  )
  OR group_id IN (SELECT id FROM groups WHERE creator_id = auth.uid())
);

DROP POLICY IF EXISTS "gp_select" ON group_posts;
CREATE POLICY "gp_select" ON group_posts FOR SELECT USING (
  user_id = auth.uid()
  OR group_id IN (
    SELECT id FROM groups WHERE type IN ('open', 'official') AND quarter_id IN (
      SELECT h.quarter_id FROM household_members hm
      JOIN households h ON h.id = hm.household_id
      WHERE hm.user_id = auth.uid() AND hm.verified_at IS NOT NULL
    )
  )
  OR group_id IN (SELECT id FROM groups WHERE creator_id = auth.uid())
);

DROP POLICY IF EXISTS "gpc_select" ON group_post_comments;
CREATE POLICY "gpc_select" ON group_post_comments FOR SELECT USING (
  user_id = auth.uid()
  OR post_id IN (SELECT id FROM group_posts)
);
