-- Rueckbau Migration 172: Device-Refresh-Tokens
begin;

drop policy if exists "users revoke own devices" on public.device_refresh_tokens;
drop policy if exists "users see own devices" on public.device_refresh_tokens;

drop index if exists public.device_refresh_tokens_token_hash_idx;
drop index if exists public.device_refresh_tokens_device_idx;
drop index if exists public.device_refresh_tokens_expires_idx;
drop index if exists public.device_refresh_tokens_user_active_idx;

drop table if exists public.device_refresh_tokens;

commit;
