-- ============================================================
-- 039: Pilotphase — Alle bestehenden Nutzer sofort verifizieren
-- ============================================================
-- Problem: is_verified_member() prueft verified_at IS NOT NULL
-- Aber bei Adress-Registrierung wurde verified_at nicht gesetzt
-- → Kein Tester konnte Features nutzen (Fundsachen, Marktplatz etc.)
--
-- Fix: Alle bestehenden household_members sofort verifizieren
-- Neue Registrierungen setzen verified_at automatisch (Code-Aenderung)
-- ============================================================

-- Alle bestehenden Mitglieder verifizieren
UPDATE household_members
SET verified_at = NOW()
WHERE verified_at IS NULL;
