-- Migration 176: Audit-Log fuer Feature-Flag-Aenderungen
-- File-first angelegt. NICHT auf Prod anwenden ohne Founder-Go.

alter table public.feature_flags
  add column if not exists last_change_reason text;

create table if not exists public.feature_flags_audit_log (
  id              bigserial primary key,
  flag_key        text not null,
  action          text not null check (action in ('insert', 'update', 'delete')),
  enabled_before  boolean,
  enabled_after   boolean,
  changed_by      uuid references auth.users(id),
  reason          text,
  metadata        jsonb default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists feature_flags_audit_log_flag_key_idx
  on public.feature_flags_audit_log (flag_key);

create index if not exists feature_flags_audit_log_created_at_idx
  on public.feature_flags_audit_log (created_at desc);

alter table public.feature_flags_audit_log enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'feature_flags_audit_log'
      and policyname = 'Admin reads feature flag audit log'
  ) then
    create policy "Admin reads feature flag audit log"
      on public.feature_flags_audit_log for select
      using (
        auth.jwt() ->> 'role' = 'admin'
        or exists (
          select 1
          from public.users
          where id = auth.uid()
            and is_admin = true
        )
      );
  end if;
end $$;

create or replace function public.log_feature_flag_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.feature_flags_audit_log
    (
      flag_key,
      action,
      enabled_before,
      enabled_after,
      changed_by,
      reason,
      metadata
    )
  values
    (
      case when tg_op = 'DELETE' then old.key else new.key end,
      lower(tg_op),
      case when tg_op = 'INSERT' then null else old.enabled end,
      case when tg_op = 'DELETE' then null else new.enabled end,
      auth.uid(),
      case
        when tg_op = 'DELETE' then old.last_change_reason
        else new.last_change_reason
      end,
      jsonb_build_object(
        'required_roles_before',
          case when tg_op = 'INSERT' then null else old.required_roles end,
        'required_roles_after',
          case when tg_op = 'DELETE' then null else new.required_roles end,
        'required_plans_before',
          case when tg_op = 'INSERT' then null else old.required_plans end,
        'required_plans_after',
          case when tg_op = 'DELETE' then null else new.required_plans end,
        'enabled_quarters_before',
          case when tg_op = 'INSERT' then null else old.enabled_quarters end,
        'enabled_quarters_after',
          case when tg_op = 'DELETE' then null else new.enabled_quarters end
      )
    );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'feature_flags_audit_log_trigger'
  ) then
    create trigger feature_flags_audit_log_trigger
      after insert or update or delete on public.feature_flags
      for each row execute function public.log_feature_flag_change();
  end if;
end $$;
