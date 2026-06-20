-- Security Advisor 0010: public.quarter_collection_areas must not bypass RLS.
-- Postgres views are security definer by default. Keep the existing view
-- definition untouched and make it obey the caller's RLS permissions.

DO $$
BEGIN
  IF to_regclass('public.quarter_collection_areas') IS NOT NULL THEN
    ALTER VIEW public.quarter_collection_areas
      SET (security_invoker = true);
  END IF;
END $$;
