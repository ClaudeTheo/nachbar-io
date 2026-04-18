-- 167_chat_display_names_rpc.sql
-- UX-Fix: Im Chat-UI sollen "Anna Schmidt" statt UUID-Kurzform angezeigt werden.
-- Problem: public.users.RLS laesst Cross-Quartier-Reads nicht zu — Anna und
-- Thomas in unterschiedlichen Quartieren sehen ihre Namen gegenseitig nicht.
--
-- Loesung: Eine SECURITY-DEFINER-RPC, die gezielt nur (id, display_name)
-- zurueckgibt — ausschliesslich fuer Peers, mit denen der Aufrufer
-- entweder einen accepted contact_link hat oder in derselben Chat-Gruppe
-- ist. Kein Oversharing (kein email_hash, keine Rolle).

CREATE OR REPLACE FUNCTION public.get_display_names(peer_ids uuid[])
RETURNS TABLE(id uuid, display_name text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT u.id, u.display_name
  FROM public.users u
  WHERE u.id = ANY(peer_ids)
    AND (
      u.id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.contact_links c
        WHERE c.status = 'accepted'
          AND (
            (c.requester_id = auth.uid() AND c.addressee_id = u.id)
            OR (c.addressee_id = auth.uid() AND c.requester_id = u.id)
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.chat_group_members m1
        JOIN public.chat_group_members m2 ON m1.group_id = m2.group_id
        WHERE m1.user_id = auth.uid()
          AND m2.user_id = u.id
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_display_names(uuid[]) TO authenticated;
