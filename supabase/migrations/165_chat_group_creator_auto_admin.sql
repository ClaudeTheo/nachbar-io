-- 165_chat_group_creator_auto_admin.sql
-- Fix: RLS-Race bei chat_groups-INSERT. Der Creator ist zum Zeitpunkt des
-- .select() noch kein Member, also blockiert cg_select (is_chat_group_member).
-- Loesung: AFTER-INSERT-Trigger fuegt den Creator automatisch als Admin hinzu,
-- bevor der Transaktions-Return stattfindet. Domain-Invariant: Wer eine Gruppe
-- erstellt, ist immer Admin dieser Gruppe.

CREATE OR REPLACE FUNCTION public.add_chat_group_creator_as_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.chat_group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin')
  ON CONFLICT (group_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_chat_group_created ON public.chat_groups;

CREATE TRIGGER on_chat_group_created
  AFTER INSERT ON public.chat_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.add_chat_group_creator_as_admin();
