-- Migration 117: Bundesland-Regeln erweitern (Pflege-Matrix BW/BY + alle 16 Laender)
-- Quelle: Pflege_Matrix_BW_BY.xlsx (offizielle Quellen geprueft fuer BW + BY)

-- 1. Neue Spalten hinzufuegen
ALTER TABLE federal_state_rules
  ADD COLUMN IF NOT EXISTS research_status text DEFAULT 'pending_research',
  ADD COLUMN IF NOT EXISTS last_checked date,
  ADD COLUMN IF NOT EXISTS recognition_type text,
  ADD COLUMN IF NOT EXISTS formal_pre_registration boolean,
  ADD COLUMN IF NOT EXISTS hourly_rate_min_cents integer,
  ADD COLUMN IF NOT EXISTS hourly_rate_max_cents integer,
  ADD COLUMN IF NOT EXISTS hourly_rate_note text,
  ADD COLUMN IF NOT EXISTS reimbursement_principle text,
  ADD COLUMN IF NOT EXISTS direct_payment_possible boolean,
  ADD COLUMN IF NOT EXISTS allowed_household boolean,
  ADD COLUMN IF NOT EXISTS allowed_cleaning boolean,
  ADD COLUMN IF NOT EXISTS allowed_shopping boolean,
  ADD COLUMN IF NOT EXISTS allowed_escort boolean,
  ADD COLUMN IF NOT EXISTS allowed_leisure boolean,
  ADD COLUMN IF NOT EXISTS allowed_snow_removal boolean,
  ADD COLUMN IF NOT EXISTS allowed_lawn_mowing boolean,
  ADD COLUMN IF NOT EXISTS insurance_note text,
  ADD COLUMN IF NOT EXISTS tax_note text,
  ADD COLUMN IF NOT EXISTS primary_official_url text,
  ADD COLUMN IF NOT EXISTS secondary_official_url text;

-- 2. BW aktualisieren (quellengesichert)
UPDATE federal_state_rules SET
  research_status = 'checked_official_sources',
  last_checked = '2026-03-27',
  recognition_type = 'Anerkennungsfiktion via signed confirmation + reimbursement form',
  formal_pre_registration = false,
  hourly_rate_min_cents = 1250,
  hourly_rate_max_cents = 2000,
  hourly_rate_note = 'Nicht gesetzlich festgelegt; Ministeriums-FAQ nennt 12,50-20,00 EUR/Stunde als ueblich',
  reimbursement_principle = 'cost_reimbursement_after_submission',
  direct_payment_possible = true,
  allowed_household = true,
  allowed_cleaning = true,
  allowed_shopping = true,
  allowed_escort = true,
  allowed_leisure = true,
  allowed_snow_removal = true,
  allowed_lawn_mowing = null,
  insurance_note = 'Eigene Haftpflicht empfohlen; keine pauschale gesetzliche Unfallversicherung',
  tax_note = 'Steuerfrei bis 3.000 EUR/Jahr (Uebungsleiterfreibetrag) bei Erfuellung der Voraussetzungen',
  primary_official_url = 'https://sozialministerium.baden-wuerttemberg.de/de/gesundheit-pflege/pflege/ehrenamt-und-selbsthilfe/anerkennung-einzelhelfende',
  secondary_official_url = 'https://sozialministerium.baden-wuerttemberg.de/fileadmin/redaktion/m-sm/intern/downloads/Downloads_Pflege/241210_AenderungsVO_UstA-VO.pdf'
WHERE state_code = 'BW';

-- 3. BY korrigieren + erweitern (quellengesichert)
-- KORREKTUREN: training_required=true (8h), max_concurrent_clients=3, formal_pre_registration=true
UPDATE federal_state_rules SET
  training_required = true,
  training_hours = 8,
  max_concurrent_clients = 3,
  registration_authority = 'Regionale Fachstelle fuer Pflege- und Behinderteneinrichtungen',
  notes = 'Registrierung bei Fachstelle erforderlich; Registrierung = Anerkennung. Gartenarbeit und hausmeisterliche Taetigkeiten ausdruecklich ausgeschlossen.',
  research_status = 'checked_official_sources',
  last_checked = '2026-03-27',
  recognition_type = 'Registrierung bei regionaler Fachstelle; Registrierung = Anerkennung',
  formal_pre_registration = true,
  hourly_rate_min_cents = null,
  hourly_rate_max_cents = null,
  hourly_rate_note = 'Kein fester Stundensatz; nur Aufwandsentschaedigung unterhalb des Mindestlohns',
  reimbursement_principle = 'mixed',
  direct_payment_possible = true,
  allowed_household = true,
  allowed_cleaning = true,
  allowed_shopping = true,
  allowed_escort = true,
  allowed_leisure = true,
  allowed_snow_removal = false,
  allowed_lawn_mowing = false,
  insurance_note = 'Haftpflicht- und Unfallversicherung erforderlich; ggf. Bayerische Ehrenamtsversicherung',
  tax_note = 'Ggf. steuerfrei; VV-AVSG verweist auf ehrenamtliche Steuerfreigrenzen',
  primary_official_url = 'https://www.stmgp.bayern.de/pflege/pflege-zu-hause/angebote-zur-unterstuetzung-im-alltag/',
  secondary_official_url = 'https://www.gesetze-bayern.de/Content/Document/BayAVSG-82'
WHERE state_code = 'BY';

-- 4. NW + HB auf pending_research setzen
UPDATE federal_state_rules SET
  research_status = 'pending_research',
  notes = 'Pflegekurs oder 30h Schulung erforderlich. Regeln noch nicht vollstaendig geprueft.'
WHERE state_code = 'NW';

UPDATE federal_state_rules SET
  research_status = 'pending_research',
  is_available = false,
  notes = 'Regeln noch nicht geprueft — Daten folgen'
WHERE state_code = 'HB';

-- 5. Neue Bundeslaender einfuegen (12 weitere, alle pending_research)
INSERT INTO federal_state_rules (state_code, state_name, is_available, min_age, relationship_exclusion_degree, same_household_excluded, training_required, research_status, notes)
VALUES
  ('BE', 'Berlin', false, 16, 2, true, false, 'pending_research', 'Regeln noch nicht geprueft — Daten folgen'),
  ('BB', 'Brandenburg', false, 16, 2, true, false, 'pending_research', 'Regeln noch nicht geprueft — Daten folgen'),
  ('HH', 'Hamburg', false, 16, 2, true, false, 'pending_research', 'Regeln noch nicht geprueft — Daten folgen'),
  ('HE', 'Hessen', false, 16, 2, true, false, 'pending_research', 'Regeln noch nicht geprueft — Daten folgen'),
  ('MV', 'Mecklenburg-Vorpommern', false, 16, 2, true, false, 'pending_research', 'Regeln noch nicht geprueft — Daten folgen'),
  ('NI', 'Niedersachsen', false, 16, 2, true, false, 'pending_research', 'Regeln noch nicht geprueft — Daten folgen'),
  ('RP', 'Rheinland-Pfalz', false, 16, 2, true, false, 'pending_research', 'Regeln noch nicht geprueft — Daten folgen'),
  ('SL', 'Saarland', false, 16, 2, true, false, 'pending_research', 'Regeln noch nicht geprueft — Daten folgen'),
  ('SN', 'Sachsen', false, 16, 2, true, false, 'pending_research', 'Regeln noch nicht geprueft — Daten folgen'),
  ('ST', 'Sachsen-Anhalt', false, 16, 2, true, false, 'pending_research', 'Regeln noch nicht geprueft — Daten folgen'),
  ('SH', 'Schleswig-Holstein', false, 16, 2, true, false, 'pending_research', 'Regeln noch nicht geprueft — Daten folgen'),
  ('TH', 'Thueringen', false, 16, 2, true, false, 'pending_research', 'Regeln noch nicht geprueft — Daten folgen')
ON CONFLICT (state_code) DO NOTHING;
