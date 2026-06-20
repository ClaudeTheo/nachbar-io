-- Rollback: restore Postgres' default security-definer view behavior.

DO $$
BEGIN
  IF to_regclass('public.quarter_collection_areas') IS NOT NULL THEN
    ALTER VIEW public.quarter_collection_areas
      RESET (security_invoker);
  END IF;
END $$;
