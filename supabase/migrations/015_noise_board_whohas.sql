-- Nachbar.io — Migration 015: Lärm-Warnung, Schwarzes Brett, Wer hat...?
-- Erweitert help_requests um drei neue Kategorien

-- Bestehenden CHECK-Constraint entfernen und neu anlegen
ALTER TABLE help_requests DROP CONSTRAINT IF EXISTS help_requests_category_check;

ALTER TABLE help_requests ADD CONSTRAINT help_requests_category_check
  CHECK (category IN (
    'garden', 'shopping', 'transport', 'tech', 'childcare',
    'handwork', 'pet_care', 'tutoring', 'company', 'other',
    'package',
    'noise',    -- Lärm-Warnung
    'board',    -- Schwarzes Brett
    'whohas'    -- Wer hat...?
  ));

-- Subcategory-Spalte fuer Lärm-Typ, Alle-Nachbarn-Flag etc.
ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS subcategory TEXT;
