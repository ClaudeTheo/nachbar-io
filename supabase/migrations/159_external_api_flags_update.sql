-- Sync aus Supabase Cloud am 2026-04-17 (nachtraeglich committed, urspruenglich via MCP apply_migration).
-- Cloud-Version: 20260417052342, Name: external_api_flags
-- Inhalt: Idempotente Wiederholung von Migration 157 (Re-Apply in Phase-A-Session).
-- Alle Statements sind IF NOT EXISTS / ON CONFLICT DO NOTHING — kein Effekt auf bestehende Daten.

BEGIN;

ALTER TABLE quarters
  ADD COLUMN IF NOT EXISTS bbk_ars TEXT,
  ADD COLUMN IF NOT EXISTS bw_ars TEXT;

COMMENT ON COLUMN quarters.bbk_ars IS
  'Regional-Schluessel fuer BBK/NINA-Dashboard-Lookup (AGS 8-stellig oder ARS 12-stellig). NULL = kein NINA-Sync fuer dieses Quartier.';
COMMENT ON COLUMN quarters.bw_ars IS
  'Baden-Wuerttemberg-AGS (8-stellig) fuer LGL-BW-WFS-Scoping. Nur BW-Quartiere, sonst NULL.';

CREATE INDEX IF NOT EXISTS idx_quarters_bbk_ars
  ON quarters(bbk_ars)
  WHERE bbk_ars IS NOT NULL;

UPDATE quarters
  SET bbk_ars = '08337007',
      bw_ars  = '08337007'
  WHERE slug = 'bad-saeckingen-pilot'
    AND bbk_ars IS NULL;

INSERT INTO feature_flags ("key", enabled, required_roles, required_plans, admin_override, description) VALUES
  ('NINA_WARNINGS_ENABLED',           false, '{}', '{}', true,  'NINA-Katastrophenwarnungen (BBK, Quelle: Bundesamt fuer Bevoelkerungsschutz und Katastrophenhilfe)'),
  ('DWD_WEATHER_WARNINGS_ENABLED',    false, '{}', '{}', true,  'DWD-Unwetter-/Hitze-/Pollenwarnungen (Quelle: Deutscher Wetterdienst, GeoNutzV)'),
  ('UBA_AIR_QUALITY_ENABLED',         false, '{}', '{}', true,  'Umweltbundesamt Luftqualitaet (Quelle: UBA, dl-de/by-2-0)'),
  ('DELFI_OEPNV_ENABLED',             false, '{}', '{}', true,  'DELFI OePNV-Abfahrten (Welle 3 — Vertrag erforderlich)'),
  ('LGL_BW_BUILDING_OUTLINES_ENABLED',false, '{}', '{}', true,  'LGL-BW Hausumringe als Karten-Layer (GeoNutzV-BW, LGL-Anzeige Pflicht)'),
  ('OSM_POI_LAYER_ENABLED',           false, '{}', '{}', true,  'OpenStreetMap POIs in Quartierkarte (Welle 2, ODbL, Export-Verbot)'),
  ('BKG_GEOCODER_FALLBACK_ENABLED',   false, '{}', '{}', true,  'BKG Geocoder als Nicht-BW-Fallback (Welle 3, ~400 EUR/Jahr)'),
  ('BFARM_DRUGS_ENABLED',             false, '{}', '{}', true,  'BfArM AMIce Medikamenten-Lookup (Welle 3, ETL-Pipeline noetig)'),
  ('DIGA_REGISTRY_ENABLED',           false, '{}', '{}', true,  'DiGA-Verzeichnis (Welle 3, wartet auf Pro-Medical-Nutzerbase)'),
  ('GKV_CARE_REGISTRY_ENABLED',       false, '{}', '{}', true,  'GKV-Pflegedienst-Verzeichnis (Welle 3, Vertrag erforderlich)')
ON CONFLICT ("key") DO NOTHING;

COMMIT;
