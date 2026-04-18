-- 165_chat_group_creator_auto_admin.down.sql
DROP TRIGGER IF EXISTS on_chat_group_created ON public.chat_groups;
DROP FUNCTION IF EXISTS public.add_chat_group_creator_as_admin();
