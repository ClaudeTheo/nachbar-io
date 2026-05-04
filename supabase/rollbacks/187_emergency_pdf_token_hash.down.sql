begin;

do $$
begin
  if to_regclass('public.emergency_profiles') is null then
    raise notice 'Rollback 187 skipped: public.emergency_profiles fehlt in diesem Replay.';
    return;
  end if;

  drop index if exists public.emergency_profiles_pdf_token_hash_idx;

  alter table public.emergency_profiles
    drop column if exists pdf_token_hash;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'emergency_profiles'
      and column_name = 'pdf_token'
  ) then
    comment on column public.emergency_profiles.pdf_token is
      'Temporärer Klartext-Token fuer Notfallmappe-PDF-/QR-Zugriff. Legacy vor Mig 187.';
  end if;
end;
$$;

commit;
