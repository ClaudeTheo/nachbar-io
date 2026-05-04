-- Migration 187: Notfallmappe-PDF-Token nur gehasht speichern
-- File-first angelegt. NICHT auf Prod anwenden ohne Founder-Go.

begin;

create extension if not exists pgcrypto;

do $$
begin
  if to_regclass('public.emergency_profiles') is null then
    raise notice 'Migration 187 skipped: public.emergency_profiles fehlt in diesem Replay.';
    return;
  end if;

  alter table public.emergency_profiles
    add column if not exists pdf_token_hash text;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'emergency_profiles'
      and column_name = 'pdf_token'
  ) then
    execute '
      update public.emergency_profiles
      set pdf_token_hash = encode(digest(pdf_token, ''sha256''), ''hex'')
      where pdf_token is not null
        and pdf_token_hash is null
    ';

    alter table public.emergency_profiles
      alter column pdf_token drop default;

    update public.emergency_profiles
    set pdf_token = null
    where pdf_token_hash is not null;

    comment on column public.emergency_profiles.pdf_token is
      'Legacy-Klartextspalte fuer alte Deploys. Nach Mig 187 leer halten und spaeter entfernen.';
  end if;

  create unique index if not exists emergency_profiles_pdf_token_hash_idx
    on public.emergency_profiles (pdf_token_hash)
    where pdf_token_hash is not null;

  comment on column public.emergency_profiles.pdf_token_hash is
    'SHA-256-Hash des temporaeren Notfallmappe-PDF-/QR-Tokens. Klartext-Token wird nicht gespeichert.';
end;
$$;

commit;
