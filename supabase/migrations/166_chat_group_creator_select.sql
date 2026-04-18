-- 166_chat_group_creator_select.sql
-- Zusaetzliche Policy: Creator sieht seine Gruppe.
-- Hintergrund: Der AFTER-INSERT-Trigger (Mig 165) fuegt den Creator
-- atomisch als Admin in chat_group_members ein, aber die RETURNING-Clause
-- nach einem INSERT liest den Member-State inkonsistent — vermutlich
-- cacht der Planner is_chat_group_member(STABLE) den Pre-Trigger-State.
-- Diese Policy gibt dem Creator direkten Read-Access und loest das
-- Catch-22, ohne Semantik zu brechen: Wer eine Gruppe erstellt, darf sie
-- immer sehen (auch nach Selbst-Leave — was bewusst akzeptabel ist).

CREATE POLICY cg_select_creator ON public.chat_groups
  FOR SELECT
  USING (created_by = auth.uid());
