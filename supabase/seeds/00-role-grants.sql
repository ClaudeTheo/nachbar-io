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
-- Dies ist das dokumentierte Supabase-Standard-Grant-Muster:
-- anon/authenticated bekommen GRANT ALL, die SICHERHEIT liefert RLS
-- (Policies aus den Migrationen), nicht der Entzug von Table-Grants.
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
