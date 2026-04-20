-- Rueckbau Migration 180: housing_invitations
begin;

drop policy if exists "hi_admin_all" on public.housing_invitations;
drop policy if exists "hi_insert_own" on public.housing_invitations;
drop policy if exists "hi_select_own" on public.housing_invitations;

drop index if exists public.idx_hi_invited_by;
drop index if exists public.idx_hi_code;
drop index if exists public.idx_hi_token;
drop index if exists public.idx_hi_household;

drop table if exists public.housing_invitations;

commit;
