-- Rollback 186: CareCircle-RLS-Bruecke zurueck auf Legacy-care_helpers

begin;

create or replace function public.is_care_helper_for(p_senior_id uuid)
returns boolean
language plpgsql
security definer
stable
as $$
declare
  v_is_helper boolean;
begin
  if to_regclass('public.care_helpers') is null then
    return false;
  end if;

  execute '
    select exists (
      select 1 from public.care_helpers
      where user_id = auth.uid()
      and $1 = any(assigned_seniors)
      and verification_status = ''verified''
    )
  '
  into v_is_helper
  using p_senior_id;

  return coalesce(v_is_helper, false);
end;
$$;

create or replace function public.care_helper_role(p_senior_id uuid)
returns text
language plpgsql
security definer
stable
as $$
declare
  v_role text;
begin
  if to_regclass('public.care_helpers') is null then
    return null;
  end if;

  execute '
    select role
    from public.care_helpers
    where user_id = auth.uid()
    and $1 = any(assigned_seniors)
    and verification_status = ''verified''
    limit 1
  '
  into v_role
  using p_senior_id;

  return v_role;
end;
$$;

commit;
