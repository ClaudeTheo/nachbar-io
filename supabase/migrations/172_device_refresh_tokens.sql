-- Migration 172: Device-Refresh-Tokens fuer Senior-App QR-Pairing
-- Task: Welle B (docs/plans/2026-04-19-senior-app-stufe1-implementation.md)
-- Kontext: Long-Lived-Refresh-Tokens fuer Senior-Geraete (Tauri Win,
--          Capacitor Android/iOS). Nach QR-Pairing bleibt das Geraet
--          6 Monate eingeloggt, rotiert alle 5 Minuten.
-- Rueckbau: 172_device_refresh_tokens.down.sql
-- Idempotent: ja (IF NOT EXISTS, Policies in DO-Block).

begin;

create table if not exists public.device_refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  device_id text not null,
  token_hash text not null,
  pairing_method text not null check (pairing_method in ('qr','code','magic_link')),
  user_agent text,
  last_ip inet,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_reason text
);

create index if not exists device_refresh_tokens_user_active_idx
  on public.device_refresh_tokens (user_id) where revoked_at is null;
create index if not exists device_refresh_tokens_expires_idx
  on public.device_refresh_tokens (expires_at);
create index if not exists device_refresh_tokens_device_idx
  on public.device_refresh_tokens (device_id, user_id);
create index if not exists device_refresh_tokens_token_hash_idx
  on public.device_refresh_tokens (token_hash) where revoked_at is null;

alter table public.device_refresh_tokens enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'device_refresh_tokens'
      and policyname = 'users see own devices'
  ) then
    create policy "users see own devices"
      on public.device_refresh_tokens for select
      using (user_id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'device_refresh_tokens'
      and policyname = 'users revoke own devices'
  ) then
    create policy "users revoke own devices"
      on public.device_refresh_tokens for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid() and revoked_at is not null);
  end if;
end $$;

comment on table public.device_refresh_tokens is
  'Long-Lived-Refresh-Tokens fuer Senior-App-Geraete (QR-Pairing). '
  '6-Monats-Lebensdauer, 5-Min-Rotation, hash-basierter Lookup. '
  'Plan: docs/plans/2026-04-19-senior-app-stufe1-implementation.md (Welle B).';

commit;
