-- Migration 136: Fix RLS Rekursion in group_members
-- Problem: gm_select referenzierte group_members in sich selbst → infinite recursion
-- Deployed via Supabase MCP (2026-04-05)

-- Fix: group_members SELECT ohne Selbst-Referenz
DROP POLICY IF EXISTS "gm_select" ON group_members;
CREATE POLICY "gm_select" ON group_members FOR SELECT USING (
  user_id = auth.uid()
  OR group_id IN (
    SELECT id FROM groups WHERE type = 'open' AND quarter_id IN (
      SELECT h.quarter_id FROM household_members hm
      JOIN households h ON h.id = hm.household_id
      WHERE hm.user_id = auth.uid() AND hm.verified_at IS NOT NULL
    )
  )
  OR group_id IN (SELECT id FROM groups WHERE creator_id = auth.uid())
);

-- Fix: group_posts SELECT ohne group_members Rekursion
DROP POLICY IF EXISTS "gp_select" ON group_posts;
CREATE POLICY "gp_select" ON group_posts FOR SELECT USING (
  user_id = auth.uid()
  OR group_id IN (
    SELECT id FROM groups WHERE type = 'open' AND quarter_id IN (
      SELECT h.quarter_id FROM household_members hm
      JOIN households h ON h.id = hm.household_id
      WHERE hm.user_id = auth.uid() AND hm.verified_at IS NOT NULL
    )
  )
  OR group_id IN (SELECT id FROM groups WHERE creator_id = auth.uid())
);
