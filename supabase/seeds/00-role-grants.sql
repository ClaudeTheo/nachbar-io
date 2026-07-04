-- ============================================================
-- Nachbar.io — Rollen-Grants fuer den LOKALEN Stack (Seed, nie Prod)
-- ============================================================
--
-- Kontext (PR #59-Blocker, CI-Run 28676017110): Neuere Supabase-Stack-
-- Images (CLI >= 2.107) vergeben fuer per Migration erstellte Tabellen
-- KEINE Standard-Rollen-Grants mehr an anon / authenticated /
-- service_role. Prod ist NICHT betroffen (dort existieren die Grants
-- seit Projektanlage ueber das Supabase-Default-Rollen-Setup); die
-- Repo-Migrationen granten nur EINZELNE Tabellen explizit an
-- authenticated (z. B. group_members) — der flaechendeckende Rest
-- kommt vom Default-Setup. Diese Datei stellt lokale Paritaet her.
--
-- Symptome ohne diese Grants im E2E:
--   1. service_role: Test-User-Seeding via Service-Key -> 42501
--      "permission denied for table users" (Seeding bricht ab).
--   2. authenticated/anon: nach erfolgreichem Login laeuft die
--      App-Runtime (Middleware liest `users`, /dashboard rendert
--      serverseitig ueber die authenticated-Session) in Timeouts,
--      weil die RLS-Queries mangels Table-Grant fehlschlagen.
--
-- Basis-Muster: anon/authenticated bekommen die Supabase-Default-GRANTs;
-- die SICHERHEIT liefert primaer RLS (Policies aus den Migrationen).
--
-- ABER: Einzelne Migrationen haerten zusaetzlich per gezieltem
-- `REVOKE ... FROM anon/authenticated` (defense-in-depth, z. B.
-- gdpr_delete_user-EXECUTE und die households.invite_code-Spalte). Da dieser
-- Seed NACH den Migrationen laeuft, wuerde der pauschale GRANT ALL diese
-- REVOKEs wieder aufheben und die lokale/CI-Sicherheit unter den Prod-Stand
-- druecken. Deshalb reproduziert der Abschnitt "Security-Paritaet" weiter
-- unten exakt die anon/authenticated-gerichteten Endzustaende der Migrationen.
-- service_role bleibt ueberall voll berechtigt (Seeding-Pfad).
--
-- Seeds laufen bei `supabase start` (Erst-Provisionierung) und
-- `supabase db reset` NACH den Migrationen — Reihenfolge siehe
-- config.toml [db.seed].sql_paths. Die ALTER DEFAULT PRIVILEGES
-- decken zusaetzlich den `supabase migration up`-Pfad ab (neue
-- Tabelle OHNE erneuten Seed-Lauf).

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

-- ============================================================
-- Security-Paritaet: anon/authenticated-Haertungen erneut anwenden
-- ------------------------------------------------------------
-- Die pauschalen GRANTs oben stellen das Supabase-Default-Rollen-Setup lokal
-- wieder her. Weil dieser Seed NACH den Migrationen laeuft, hebt er sonst die
-- gezielten Sicherheits-REVOKEs spaeterer Migrationen auf. Hier werden exakt
-- die Endzustaende reproduziert, die die Migrationen fuer anon/authenticated
-- setzen (Prod-Paritaet fuer Local/CI). service_role bleibt unangetastet.
--
-- Nur REVOKEs, die anon/authenticated DIREKT nennen, muessen gespiegelt
-- werden: `REVOKE ... FROM PUBLIC` allein sperrt anon/authenticated in diesem
-- Setup NICHT (Supabase vergibt direkte Default-Grants; siehe Migration
-- 20260529150000_gdpr_delete_user_revoke_anon.sql).
--
-- DURABLE: Jede kuenftige Migration mit `REVOKE ... FROM anon`/`authenticated`
-- (oder column-level GRANT-SELECT-Aenderungen) MUSS hier gespiegelt werden,
-- sonst faellt die lokale/CI-Sicherheitsparitaet auseinander.
-- ============================================================

-- CRITICAL: gdpr_delete_user (SECURITY DEFINER, loescht Nutzer per UUID via RPC)
--   Quelle: 20260529150000_gdpr_delete_user_revoke_anon.sql (service_role behaelt EXECUTE)
revoke execute on function public.gdpr_delete_user(uuid) from anon, authenticated, public;

-- HIGH: households.invite_code-Spaltenschutz (Row-Isolation reicht nicht)
--   Quelle: 20260530160000_revoke_invite_code_select.sql
revoke select on public.households from anon, authenticated;
revoke select (invite_code) on public.households from anon, authenticated;
grant select (
  id, street_name, house_number, lat, lng, verified, created_at, quarter_id,
  map_house_id, quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
  postal_code, city, position_source, position_accuracy, position_verified,
  position_verified_at, position_manual_override, position_raw_payload
) on public.households to authenticated, anon;

-- Interest-Groups: RLS + gezielte Table-Grants (kein pauschaler Client-Zugriff)
--   Quelle: 20260527183000_enable_rls_group_members.sql
revoke all on table public.group_members from anon, authenticated;
grant select, insert, update on table public.group_members to authenticated;
--   Quelle: 20260527191000_restore_interest_groups_rls.sql
revoke all on table public.groups from anon, authenticated;
grant select, insert, delete on table public.groups to authenticated;
grant update (name, description, category, type, updated_at) on table public.groups to authenticated;
revoke all on table public.group_posts from anon, authenticated;
grant select, insert, delete on table public.group_posts to authenticated;
revoke all on table public.group_post_comments from anon, authenticated;
grant select, insert, delete on table public.group_post_comments to authenticated;
revoke all on table public.group_notification_settings from anon, authenticated;
grant select, insert, update, delete on table public.group_notification_settings to authenticated;

-- Audit-Log / Consent: Clients duerfen nicht aendern/loeschen
--   Quelle: 150_harden_audit_log.sql / 151_consent_grants.sql
revoke update, delete on table public.org_audit_log from anon, authenticated;
revoke delete on table public.consent_grants from anon, authenticated;

-- spatial_ref_sys: PostGIS-Referenztabelle nur lesbar fuer Clients
--   Quelle: 20260610193356_spatial_ref_sys_rls_readonly.sql
--   Defensiv: Owner ist ggf. supabase_admin -> REVOKE/GRANT kann scheitern.
do $$
begin
  revoke all on table public.spatial_ref_sys from anon, authenticated;
  grant select on table public.spatial_ref_sys to anon, authenticated;
exception
  when insufficient_privilege or undefined_table then
    raise notice 'seed 00-role-grants: spatial_ref_sys REVOKE/GRANT uebersprungen (%).', sqlerrm;
end
$$;
