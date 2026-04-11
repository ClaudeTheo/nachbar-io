-- Migration 153: Duplicate Indexes entfernen
-- Gefunden durch Supabase Performance Advisor (2026-04-11, nach Pro-Upgrade)
--
-- Zwei Tabellen haben je zwei identische Indexes. PostgreSQL speichert beide,
-- haelt beide bei INSERT/UPDATE aktuell, und nutzt nur einen davon. Doppelter
-- Schreib-Overhead, doppelter Speicherverbrauch, kein Gewinn.
--
-- Risiko: Null. Beide Indexes sind byte-identisch (Advisor verifiziert).
-- Reversibel: Ja, `CREATE INDEX` kann den gedroppten Index jederzeit wieder anlegen.

-- consultation_slots: idx_consultation_slots_host ist Prefix von idx_consultation_slots_host_status
-- Das kombinierte Index (host, status) deckt den Host-only Query-Pattern mit ab.
-- Wir behalten den umfassenderen Index.
DROP INDEX IF EXISTS public.idx_consultation_slots_host;

-- test_sessions: idx_test_sessions_visited_routes vs idx_test_sessions_visited_routesa (Tippfehler beim Anlegen)
-- Der "a"-Suffix ist offensichtlich versehentlich. Den Tippfehler-Index droppen.
DROP INDEX IF EXISTS public.idx_test_sessions_visited_routesa;
