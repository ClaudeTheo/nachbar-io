-- ============================================================
-- Nachbar.io — Migration 018: Profil-Felder bio + phone
-- Profilvervollstaendigung: Optionale Angaben
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
