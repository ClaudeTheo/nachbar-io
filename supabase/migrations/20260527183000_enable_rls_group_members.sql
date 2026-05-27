-- Enable RLS on public.group_members (Interest-Groups, not chat groups).
-- Reason: Mig 161 disabled RLS after the chat table namespace fix.
-- Mini-Audit: docs/plans/handoff/2026-05-27-rls-group_members-mini-audit.md

BEGIN;

COMMENT ON TABLE public.group_members IS
  'Mitgliedschaft in Interessengruppen aus Mig 133. Nicht zu verwechseln mit chat_group_members.';

CREATE OR REPLACE FUNCTION public.is_interest_group_admin(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = auth.uid()
      AND gm.status = 'active'
      AND gm.role IN ('founder', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_interest_group_member(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = auth.uid()
      AND gm.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_interest_group_founder(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = auth.uid()
      AND gm.status = 'active'
      AND gm.role = 'founder'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_interest_group_creator(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.groups g
    WHERE g.id = p_group_id
      AND g.creator_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_found_interest_group(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.groups g
    JOIN public.households h ON h.quarter_id = g.quarter_id
    JOIN public.household_members hm ON hm.household_id = h.id
    WHERE g.id = p_group_id
      AND g.creator_id = auth.uid()
      AND hm.user_id = auth.uid()
      AND hm.verified_at IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.can_join_interest_group(
  p_group_id uuid,
  p_allowed_types text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.groups g
    JOIN public.households h ON h.quarter_id = g.quarter_id
    JOIN public.household_members hm ON hm.household_id = h.id
    WHERE g.id = p_group_id
      AND g.type = ANY(p_allowed_types)
      AND hm.user_id = auth.uid()
      AND hm.verified_at IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.is_interest_group_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_interest_group_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_interest_group_founder(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_interest_group_creator(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_found_interest_group(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_join_interest_group(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_interest_group_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_interest_group_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_interest_group_founder(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_interest_group_creator(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_found_interest_group(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_join_interest_group(uuid, text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_group_member_identity_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.group_id IS DISTINCT FROM OLD.group_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'group_members group_id/user_id cannot be changed'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_group_members_identity_immutable
ON public.group_members;

CREATE TRIGGER trg_group_members_identity_immutable
  BEFORE UPDATE OF group_id, user_id ON public.group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_group_member_identity_change();

REVOKE ALL ON FUNCTION public.prevent_group_member_identity_change() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.refresh_group_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  affected_group_id uuid;
BEGIN
  affected_group_id := COALESCE(NEW.group_id, OLD.group_id);

  UPDATE public.groups g
  SET member_count = (
        SELECT COUNT(*)::integer
        FROM public.group_members gm
        WHERE gm.group_id = affected_group_id
          AND gm.status = 'active'
      ),
      updated_at = now()
  WHERE g.id = affected_group_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_group_members_refresh_member_count
ON public.group_members;

CREATE TRIGGER trg_group_members_refresh_member_count
  AFTER INSERT OR DELETE OR UPDATE OF status ON public.group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_group_member_count();

REVOKE ALL ON FUNCTION public.refresh_group_member_count() FROM PUBLIC;

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gm_select ON public.group_members;
DROP POLICY IF EXISTS gm_insert ON public.group_members;
DROP POLICY IF EXISTS gm_update ON public.group_members;
DROP POLICY IF EXISTS gm_delete ON public.group_members;
DROP POLICY IF EXISTS group_members_select_scoped ON public.group_members;
DROP POLICY IF EXISTS group_members_insert_self ON public.group_members;
DROP POLICY IF EXISTS group_members_update_self ON public.group_members;
DROP POLICY IF EXISTS group_members_update_group_admin ON public.group_members;

REVOKE ALL ON TABLE public.group_members FROM anon;
REVOKE ALL ON TABLE public.group_members FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.group_members TO authenticated;

CREATE POLICY group_members_select_scoped
ON public.group_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_interest_group_member(group_id)
  OR public.is_interest_group_admin(group_id)
  OR public.is_interest_group_creator(group_id)
  OR public.can_join_interest_group(group_id, ARRAY['open', 'official'])
);

CREATE POLICY group_members_insert_self
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    (
      role = 'founder'
      AND status = 'active'
      AND public.can_found_interest_group(group_id)
    )
    OR (
      role = 'member'
      AND (
        (
          status = 'active'
          AND public.can_join_interest_group(group_id, ARRAY['open'])
        )
        OR (
          status = 'pending'
          AND public.can_join_interest_group(group_id, ARRAY['closed', 'official'])
        )
      )
    )
  )
);

CREATE POLICY group_members_update_self
ON public.group_members
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND role IN ('member', 'admin')
)
WITH CHECK (
  user_id = auth.uid()
  AND (
    (
      role IN ('member', 'admin')
      AND status = 'removed'
    )
    OR (
      role = 'member'
      AND status = 'active'
      AND public.can_join_interest_group(group_id, ARRAY['open'])
    )
    OR (
      role = 'member'
      AND status = 'pending'
      AND public.can_join_interest_group(group_id, ARRAY['closed', 'official'])
    )
  )
);

CREATE POLICY group_members_update_group_admin
ON public.group_members
FOR UPDATE
TO authenticated
USING (
  (
    public.is_interest_group_founder(group_id)
    AND role <> 'founder'
  )
  OR (
    public.is_interest_group_admin(group_id)
    AND role = 'member'
  )
)
WITH CHECK (
  role IN ('member', 'admin')
  AND status IN ('active', 'pending', 'removed')
  AND (
    public.is_interest_group_founder(group_id)
    OR public.is_interest_group_admin(group_id)
  )
);

COMMIT;
