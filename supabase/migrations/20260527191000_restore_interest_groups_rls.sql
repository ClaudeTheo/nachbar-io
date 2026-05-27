-- Restore complete RLS coverage for Interest-Groups.
-- Reason: Migration 133 documented policies as deployed, but local replay only
-- contains partial group_posts/group_post_comments policies and no groups policy.

BEGIN;

CREATE OR REPLACE FUNCTION public.is_verified_in_quarter(p_quarter_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_members hm
    JOIN public.households h ON h.id = hm.household_id
    WHERE h.quarter_id = p_quarter_id
      AND hm.user_id = auth.uid()
      AND hm.verified_at IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.can_read_interest_group_post(p_post_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_posts gp
    WHERE gp.id = p_post_id
      AND (
        gp.user_id = auth.uid()
        OR public.is_interest_group_member(gp.group_id)
        OR public.is_interest_group_creator(gp.group_id)
        OR public.can_join_interest_group(gp.group_id, ARRAY['open', 'official'])
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_comment_interest_group_post(p_post_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_posts gp
    WHERE gp.id = p_post_id
      AND public.is_interest_group_member(gp.group_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.prevent_group_identity_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.quarter_id IS DISTINCT FROM OLD.quarter_id
     OR NEW.creator_id IS DISTINCT FROM OLD.creator_id THEN
    RAISE EXCEPTION 'groups quarter_id/creator_id cannot be changed'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_groups_identity_immutable
ON public.groups;

CREATE TRIGGER trg_groups_identity_immutable
  BEFORE UPDATE OF quarter_id, creator_id ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_group_identity_change();

REVOKE ALL ON FUNCTION public.is_verified_in_quarter(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_read_interest_group_post(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_comment_interest_group_post(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_group_identity_change() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_verified_in_quarter(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_interest_group_post(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_comment_interest_group_post(uuid) TO authenticated;

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS g_select ON public.groups;
DROP POLICY IF EXISTS g_insert ON public.groups;
DROP POLICY IF EXISTS g_update ON public.groups;
DROP POLICY IF EXISTS g_delete ON public.groups;
DROP POLICY IF EXISTS groups_select ON public.groups;
DROP POLICY IF EXISTS groups_insert ON public.groups;
DROP POLICY IF EXISTS groups_update ON public.groups;
DROP POLICY IF EXISTS groups_delete ON public.groups;
DROP POLICY IF EXISTS groups_select_quarter ON public.groups;
DROP POLICY IF EXISTS groups_insert_creator ON public.groups;
DROP POLICY IF EXISTS groups_update_admin ON public.groups;
DROP POLICY IF EXISTS groups_delete_founder ON public.groups;

DROP POLICY IF EXISTS gp_select ON public.group_posts;
DROP POLICY IF EXISTS gp_insert ON public.group_posts;
DROP POLICY IF EXISTS gp_delete ON public.group_posts;
DROP POLICY IF EXISTS group_posts_select_visible ON public.group_posts;
DROP POLICY IF EXISTS group_posts_insert_member ON public.group_posts;
DROP POLICY IF EXISTS group_posts_delete_author ON public.group_posts;

DROP POLICY IF EXISTS gpc_select ON public.group_post_comments;
DROP POLICY IF EXISTS gpc_insert ON public.group_post_comments;
DROP POLICY IF EXISTS gpc_delete ON public.group_post_comments;
DROP POLICY IF EXISTS group_post_comments_select_visible ON public.group_post_comments;
DROP POLICY IF EXISTS group_post_comments_insert_member ON public.group_post_comments;
DROP POLICY IF EXISTS group_post_comments_delete_author ON public.group_post_comments;

DROP POLICY IF EXISTS gns_all ON public.group_notification_settings;
DROP POLICY IF EXISTS gns_all_own ON public.group_notification_settings;
DROP POLICY IF EXISTS group_notification_settings_select_own ON public.group_notification_settings;
DROP POLICY IF EXISTS group_notification_settings_insert_own ON public.group_notification_settings;
DROP POLICY IF EXISTS group_notification_settings_update_own ON public.group_notification_settings;
DROP POLICY IF EXISTS group_notification_settings_delete_own ON public.group_notification_settings;

REVOKE ALL ON TABLE public.groups FROM anon;
REVOKE ALL ON TABLE public.groups FROM authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.groups TO authenticated;
GRANT UPDATE (name, description, category, type, updated_at) ON TABLE public.groups TO authenticated;

REVOKE ALL ON TABLE public.group_posts FROM anon;
REVOKE ALL ON TABLE public.group_posts FROM authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.group_posts TO authenticated;

REVOKE ALL ON TABLE public.group_post_comments FROM anon;
REVOKE ALL ON TABLE public.group_post_comments FROM authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.group_post_comments TO authenticated;

REVOKE ALL ON TABLE public.group_notification_settings FROM anon;
REVOKE ALL ON TABLE public.group_notification_settings FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.group_notification_settings TO authenticated;

CREATE POLICY groups_select_quarter
ON public.groups
FOR SELECT
TO authenticated
USING (
  public.is_verified_in_quarter(quarter_id)
);

CREATE POLICY groups_insert_creator
ON public.groups
FOR INSERT
TO authenticated
WITH CHECK (
  creator_id = auth.uid()
  AND member_count = 1
  AND public.is_verified_in_quarter(quarter_id)
);

CREATE POLICY groups_update_admin
ON public.groups
FOR UPDATE
TO authenticated
USING (
  creator_id = auth.uid()
  OR public.is_interest_group_admin(id)
)
WITH CHECK (
  public.is_verified_in_quarter(quarter_id)
  AND (
    creator_id = auth.uid()
    OR public.is_interest_group_admin(id)
  )
);

CREATE POLICY groups_delete_founder
ON public.groups
FOR DELETE
TO authenticated
USING (
  creator_id = auth.uid()
  OR public.is_interest_group_founder(id)
);

CREATE POLICY group_posts_select_visible
ON public.group_posts
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_interest_group_member(group_id)
  OR public.is_interest_group_creator(group_id)
  OR public.can_join_interest_group(group_id, ARRAY['open', 'official'])
);

CREATE POLICY group_posts_insert_member
ON public.group_posts
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.is_interest_group_member(group_id)
);

CREATE POLICY group_posts_delete_author
ON public.group_posts
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
);

CREATE POLICY group_post_comments_select_visible
ON public.group_post_comments
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.can_read_interest_group_post(post_id)
);

CREATE POLICY group_post_comments_insert_member
ON public.group_post_comments
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.can_comment_interest_group_post(post_id)
);

CREATE POLICY group_post_comments_delete_author
ON public.group_post_comments
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
);

CREATE POLICY group_notification_settings_select_own
ON public.group_notification_settings
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

CREATE POLICY group_notification_settings_insert_own
ON public.group_notification_settings
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    public.is_interest_group_member(group_id)
    OR public.is_interest_group_creator(group_id)
    OR public.can_join_interest_group(group_id, ARRAY['open', 'closed', 'official'])
  )
);

CREATE POLICY group_notification_settings_update_own
ON public.group_notification_settings
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY group_notification_settings_delete_own
ON public.group_notification_settings
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
);

COMMIT;
