-- Migration: gdpr_delete_user EXECUTE-Grant härten (anon/authenticated entziehen)
-- Datum: 2026-05-30 — Folge-Fix zu 20260529140000 (Pre-Pilot-Audit Cluster B)
--
-- PROBLEM (CRITICAL, beim Prod-Apply der Hauptmigration entdeckt): Die Hauptmigration
-- 20260529140000 sicherte gdpr_delete_user nur mit `REVOKE ALL ... FROM PUBLIC` +
-- `GRANT EXECUTE ... TO service_role`. Supabase vergibt jedoch über
-- ALTER DEFAULT PRIVILEGES automatisch EXPLIZITE EXECUTE-Grants an die Rollen `anon`
-- und `authenticated` für jede neue Funktion im public-Schema. `REVOKE FROM PUBLIC`
-- entfernt diese expliziten Rollen-Grants NICHT.
--
-- Folge: gdpr_delete_user (SECURITY DEFINER, löscht beliebigen Nutzer per uuid) war für
-- `anon` (öffentlicher Client-Key) und `authenticated` (jeder eingeloggte Nutzer) über
-- den PostgREST-RPC-Endpunkt aufrufbar. Ein beliebiger Aufrufer hätte jeden Nutzer
-- löschen können — RLS wird durch SECURITY DEFINER (Ausführung als Owner) umgangen.
-- In Prod sofort per REVOKE geschlossen; diese Migration verankert den Fix im Repo,
-- damit kein Branch-/Stack-Replay die Lücke neu erzeugt.
--
-- FIX: EXECUTE explizit für anon, authenticated und PUBLIC entziehen. Nur `service_role`
-- (server-seitiger Lösch-Service) und `postgres` (Owner, nicht client-zugänglich)
-- behalten EXECUTE. Idempotent (REVOKE eines bereits entzogenen Rechts ist ein No-Op).
--
-- DURABLE LEHRE: Bei SECURITY-DEFINER-Funktionen im public-Schema von Supabase IMMER
-- explizit `REVOKE EXECUTE ... FROM anon, authenticated` (zusätzlich zu FROM PUBLIC),
-- und die effektiven Grants nach dem Apply über pg_proc.proacl verifizieren — nie nur
-- annehmen, dass REVOKE FROM PUBLIC genügt.

REVOKE EXECUTE ON FUNCTION public.gdpr_delete_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.gdpr_delete_user(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.gdpr_delete_user(uuid) FROM PUBLIC;
