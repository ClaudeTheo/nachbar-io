-- Migration 078: Fix video_credits + video_credit_usage RLS
-- Sicherheitsproblem: ALL-Policy erlaubte Aerzten, sich selbst Credits anzulegen
-- Fix: Nur SELECT fuer Client, INSERT/UPDATE/DELETE ausschliesslich via Service Role
--
-- Ausgefuehrt auf Supabase: 2026-03-16 (via execute_sql)

DO $$
BEGIN
  -- 1. video_credits: ALL → SELECT only
  IF to_regclass('public.video_credits') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "video_credits_owner" ON public.video_credits';
    EXECUTE 'DROP POLICY IF EXISTS "video_credits_owner_select" ON public.video_credits';
    EXECUTE '
      CREATE POLICY "video_credits_owner_select" ON public.video_credits
        FOR SELECT
        USING (auth.uid() = doctor_id)
    ';
  END IF;

  -- 2. video_credit_usage: ALL → SELECT only
  IF to_regclass('public.video_credits') IS NOT NULL
    AND to_regclass('public.video_credit_usage') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "video_credit_usage_owner" ON public.video_credit_usage';
    EXECUTE 'DROP POLICY IF EXISTS "video_credit_usage_owner_select" ON public.video_credit_usage';
    EXECUTE '
      CREATE POLICY "video_credit_usage_owner_select" ON public.video_credit_usage
        FOR SELECT
        USING (EXISTS (
          SELECT 1 FROM public.video_credits vc
          WHERE vc.id = video_credit_usage.credit_id
          AND vc.doctor_id = auth.uid()
        ))
    ';
  END IF;
END $$;
