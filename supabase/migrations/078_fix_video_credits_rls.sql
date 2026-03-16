-- Migration 078: Fix video_credits + video_credit_usage RLS
-- Sicherheitsproblem: ALL-Policy erlaubte Aerzten, sich selbst Credits anzulegen
-- Fix: Nur SELECT fuer Client, INSERT/UPDATE/DELETE ausschliesslich via Service Role
--
-- Ausgefuehrt auf Supabase: 2026-03-16 (via execute_sql)

-- 1. video_credits: ALL → SELECT only
DROP POLICY IF EXISTS "video_credits_owner" ON public.video_credits;
DROP POLICY IF EXISTS "video_credits_owner_select" ON public.video_credits;

CREATE POLICY "video_credits_owner_select" ON public.video_credits
  FOR SELECT
  USING (auth.uid() = doctor_id);

-- 2. video_credit_usage: ALL → SELECT only
DROP POLICY IF EXISTS "video_credit_usage_owner" ON public.video_credit_usage;
DROP POLICY IF EXISTS "video_credit_usage_owner_select" ON public.video_credit_usage;

CREATE POLICY "video_credit_usage_owner_select" ON public.video_credit_usage
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM video_credits vc
    WHERE vc.id = video_credit_usage.credit_id
    AND vc.doctor_id = auth.uid()
  ));
