-- Migration 180: Bewohner-zu-Hausverwaltung Einladungs-Token
-- Task: H aus docs/plans/2026-04-20-handoff-housing-part-h-and-deploy.md
-- Kontext: Bewohner ist Sender, App stellt nur Tools (mailto/Web-Share/PDF).
--          Anwaltsfrei, kein Resend-SMTP. Magic-Link + 6-stelliger Backup-Code.
-- Rueckbau: 180_housing_invitations.down.sql
-- Idempotent: ja (IF NOT EXISTS, Policies in DO-Block).

begin;

create table if not exists public.housing_invitations (
  id uuid primary key default gen_random_uuid(),
  invite_token text unique not null,
  invite_code text unique not null,
  invited_by_user_id uuid not null references auth.users(id) on delete cascade,
  invited_household_id uuid not null references public.households(id) on delete cascade,
  expected_org_name text not null,
  expected_email text null,
  channel text not null check (channel in ('mailto', 'share', 'pdf')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  consumed_at timestamptz null,
  consumed_by_user_id uuid null references auth.users(id) on delete set null,
  consumed_by_civic_org_id uuid null references public.civic_organizations(id) on delete set null
);

create index if not exists idx_hi_household
  on public.housing_invitations(invited_household_id);
create index if not exists idx_hi_token
  on public.housing_invitations(invite_token)
  where consumed_at is null;
create index if not exists idx_hi_code
  on public.housing_invitations(invite_code)
  where consumed_at is null;
create index if not exists idx_hi_invited_by
  on public.housing_invitations(invited_by_user_id);

alter table public.housing_invitations enable row level security;

-- Bewohner sieht eigene Einladungen (selbst erstellt ODER gleicher Haushalt)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'housing_invitations' and policyname = 'hi_select_own'
  ) then
    create policy "hi_select_own" on public.housing_invitations
      for select using (
        invited_by_user_id = auth.uid()
        or invited_household_id in (
          select household_id from public.household_members where user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Bewohner darf eigene Einladungen anlegen (erzwungener Haushalt-Link)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'housing_invitations' and policyname = 'hi_insert_own'
  ) then
    create policy "hi_insert_own" on public.housing_invitations
      for insert with check (
        invited_by_user_id = auth.uid()
        and invited_household_id in (
          select household_id from public.household_members where user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Admins sehen alles (Standard-Escape-Hatch)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'housing_invitations' and policyname = 'hi_admin_all'
  ) then
    create policy "hi_admin_all" on public.housing_invitations
      for all using (
        exists (select 1 from public.users where id = auth.uid() and is_admin = true)
      );
  end if;
end $$;

-- Consume-Pfad laeuft ueber Service-Role (Admin-API). Keine User-RLS-Policy
-- fuer UPDATE/DELETE noetig, da RLS fuer Service-Role bypassed ist.

comment on table public.housing_invitations is
  'Bewohner-zu-Hausverwaltung Einladungen. Bewohner erzeugt Token/Code, teilt via mailto/Web-Share/PDF. HV loest via Service-Role ein -> legt civic_organization + civic_members + housing_resident_links an. Ab Mig 180.';

commit;
