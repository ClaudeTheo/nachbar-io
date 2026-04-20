-- Migration 176: Verknuepfung Bewohner <-> Hausverwaltung
-- Task: A2 aus docs/plans/2026-04-21-hausverwaltung-modul-implementation.md
-- Kontext: Bewohner ist KEIN org_members-Staff, sondern bekommt eine
--          eigene Assignment-Tabelle. Vorbild: 071_caregiver_links +
--          132_pflege_resident_assignments.
-- Reihenfolge: Muss vor 177 (report_category + target_org_id) laufen,
--          weil dessen RLS-Policies auf housing_resident_links filtern.
-- Rueckbau: 176_housing_resident_links.down.sql
-- Idempotent: ja (IF NOT EXISTS, Policies in DO-Block).

begin;

create table if not exists public.housing_resident_links (
  id uuid primary key default gen_random_uuid(),
  civic_org_id uuid not null references public.civic_organizations(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid null references auth.users(id) on delete set null,
  linked_by uuid not null references auth.users(id),
  linked_at timestamptz not null default now(),
  revoked_at timestamptz null,
  notes text null,
  unique (civic_org_id, household_id)
);

create index if not exists idx_hrl_household
  on public.housing_resident_links(household_id);
create index if not exists idx_hrl_civic_org
  on public.housing_resident_links(civic_org_id);
create index if not exists idx_hrl_user
  on public.housing_resident_links(user_id)
  where user_id is not null;
create index if not exists idx_hrl_active
  on public.housing_resident_links(civic_org_id, household_id)
  where revoked_at is null;

alter table public.housing_resident_links enable row level security;

-- Bewohner: sieht eigenen Link (via user_id oder Haushaltszugehoerigkeit)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'housing_resident_links' and policyname = 'hrl_select_resident'
  ) then
    create policy "hrl_select_resident" on public.housing_resident_links
      for select using (
        user_id = auth.uid()
        or household_id in (
          select household_id from public.household_members where user_id = auth.uid()
        )
      );
  end if;
end $$;

-- HV-Staff: sieht Links der eigenen civic_organization
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'housing_resident_links' and policyname = 'hrl_select_staff'
  ) then
    create policy "hrl_select_staff" on public.housing_resident_links
      for select using (
        civic_org_id in (
          select org_id from public.civic_members where user_id = auth.uid()
        )
      );
  end if;
end $$;

-- HV-Staff (admin/editor) kann Links erstellen
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'housing_resident_links' and policyname = 'hrl_insert_staff'
  ) then
    create policy "hrl_insert_staff" on public.housing_resident_links
      for insert with check (
        linked_by = auth.uid()
        and civic_org_id in (
          select org_id from public.civic_members
          where user_id = auth.uid()
            and role in ('admin', 'editor')
        )
      );
  end if;
end $$;

-- HV-Staff (admin/editor) kann Links widerrufen (revoked_at setzen)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'housing_resident_links' and policyname = 'hrl_update_staff'
  ) then
    create policy "hrl_update_staff" on public.housing_resident_links
      for update using (
        civic_org_id in (
          select org_id from public.civic_members
          where user_id = auth.uid()
            and role in ('admin', 'editor')
        )
      );
  end if;
end $$;

-- Admins sehen alles (Standard-Escape-Hatch)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'housing_resident_links' and policyname = 'hrl_admin_all'
  ) then
    create policy "hrl_admin_all" on public.housing_resident_links
      for all using (
        exists (select 1 from public.users where id = auth.uid() and is_admin = true)
      );
  end if;
end $$;

comment on table public.housing_resident_links is
  'Verknuepfung Haushalt <-> Hausverwaltung (civic_organizations.type="housing"). Kein org_members-Eintrag (Bewohner ist kein Staff). Vorbild: 071_caregiver_links, 132_pflege_resident_assignments. Ab Mig 176.';

commit;
