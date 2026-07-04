-- ============================================================
-- Nachbar.io — Rollen-Grants fuer den LOKALEN Stack (Seed, nie Prod)
-- ============================================================
--
-- Kontext (PR #59-Blocker, CI-Run 28676017110): Neuere Supabase-Stack-
-- Images (CLI >= 2.107) vergeben fuer per Migration erstellte Tabellen
-- keine service_role-Grants mehr. Folge im E2E: Test-User-Seeding via
-- Service-Key scheiterte mit 42501 "permission denied for table users",
-- alle [auth]-Setups liefen in Timeouts, der S1-S6-Job starb am
-- 30-min-Limit. Prod ist NICHT betroffen (dort existieren die Grants
-- seit Projektanlage); diese Datei stellt lokale Paritaet her.
--
-- Seeds laufen bei `supabase start` (Erst-Provisionierung) und
-- `supabase db reset` NACH den Migrationen — Reihenfolge siehe
-- config.toml [db.seed].sql_paths.
--
-- Die ALTER DEFAULT PRIVILEGES decken den Fall `supabase migration up`
-- ab (inkrementelle neue Migration OHNE erneuten Seed-Lauf): auch dann
-- bekommen neue Tabellen/Sequenzen/Funktionen die service_role-Grants.

grant usage on schema public to service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;
