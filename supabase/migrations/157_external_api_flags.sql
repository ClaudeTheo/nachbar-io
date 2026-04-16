-- Migration 157: Externe-APIs-Welle-1 — Feature-Flags + Quartier-Identifier
--
-- STATUS: ENTWURF — NICHT ANGEWENDET
-- Plan-Dokument: docs/plans/2026-04-17-nina-dwd-integration.md
-- Handoff:       docs/plans/2026-04-16-external-apis-research-handoff.md
--
-- Zweck:
--   1) 10 neue Feature-Flags fuer externe Datenquellen (NINA, DWD, UBA,
--      DELFI, LGL-BW Outlines, OSM POIs, BKG Geocoder, BfArM, DiGA, GKV).
--      Alle default FALSE, enabled_quarters=[] — bewusst ausgeschaltet,
--      Aktivierung pro Quartier ueber Admin-UI.
--   2) Quartier-Identifier `bbk_ars` und `bw_ars` fuer NINA-Dashboard-Lookup
--      und LGL-BW-WFS-Scoping. Beide optional, weil Welle 1 nur Bad
--      Saeckingen aktiv nutzt.
--
-- Rechtliche Basis (siehe Handoff Abschnitt „Rechtsrisiko-Matrix"):
--   - NINA:        Quellenangabe BBK Pflicht, sonst keine Auflagen
--   - DWD:         GeoNutzV, Quellenangabe „Deutscher Wetterdienst"
--   - UBA:         dl-de/by-2-0, Quellenangabe „Umweltbundesamt"
--   - LGL-BW:      GeoNutzV-BW, Anzeige beim LGL vor kommerzieller Nutzung
--
-- Founder-Go erforderlich vor Anwendung. Deployment-Reihenfolge
-- (Founder-Entscheidung 2026-04-16, im Plan-Dokument Abschnitt
-- „Getroffene Entscheidungen" verankert):
--   (a) MCP apply_migration(name="external_api_flags") mit diesem Inhalt
--       — NICHT `supabase db push`, sonst Drift-Risiko gegen 156
--       existierende Migrationen.
--   (b) MCP execute_sql mit den Verifikations-SELECTs unten.
--   (c) MCP apply_migration(name="external_warning_cache") fuer 158.
--   (d) Phase B Code deployen (siehe Plan-Dokument Task 4-14).
--   (e) Flags in Admin-UI pro Quartier scharfschalten.
--       LGL_BW_BUILDING_OUTLINES_ENABLED erst nach Einreichung der
--       LGL-BW-Anzeige durch Founder (Founder-Entscheidung 1).

BEGIN;

-- ============================================================
-- 1) quarters-Spalten fuer externe API-Identifier
-- ============================================================
-- bbk_ars: Regional-Schluessel fuer NINA-Dashboard-Lookup
--          (https://warnung.bund.de/api31/dashboard/{ARS}.json).
--          NINA akzeptiert sowohl den 8-stelligen AGS als auch den
--          12-stelligen ARS; die Abloesung auf 12-stellig kann der
--          Client bei Bedarf per Padding selbst vornehmen. Wir seeden
--          den verifizierten 8-stelligen AGS aus dem Handoff-Dokument
--          (Abschnitt A1: „Bad Saeckingen ARS = `08337007`"), damit
--          kein fabrizierter Wert in die DB kommt.
-- bw_ars:  Baden-Wuerttemberg-spezifischer Regional-Schluessel fuer
--          LGL-BW-Services. Aktuell identisch zum AGS (8-stellig), Spalte
--          bleibt separat fuer den Fall, dass LGL-BW spaeter eine andere
--          interne ID braucht. Nur BW-Quartiere; ausserhalb BW NULL.
ALTER TABLE quarters
  ADD COLUMN IF NOT EXISTS bbk_ars TEXT,
  ADD COLUMN IF NOT EXISTS bw_ars TEXT;

COMMENT ON COLUMN quarters.bbk_ars IS
  'Regional-Schluessel fuer BBK/NINA-Dashboard-Lookup (AGS 8-stellig oder ARS 12-stellig). NULL = kein NINA-Sync fuer dieses Quartier.';
COMMENT ON COLUMN quarters.bw_ars IS
  'Baden-Wuerttemberg-AGS (8-stellig) fuer LGL-BW-WFS-Scoping. Nur BW-Quartiere, sonst NULL.';

-- Partial Index: nur Quartiere mit aktivem BBK-Sync
CREATE INDEX IF NOT EXISTS idx_quarters_bbk_ars
  ON quarters(bbk_ars)
  WHERE bbk_ars IS NOT NULL;

-- Bad Saeckingen-Pilotquartier seeden (AGS aus Handoff verifiziert).
-- Die Werte sind unabhaengig von der NINA-Flag-Aktivierung und blockieren nichts.
UPDATE quarters
  SET bbk_ars = '08337007',
      bw_ars  = '08337007'
  WHERE slug = 'bad-saeckingen-pilot'
    AND bbk_ars IS NULL;

-- ============================================================
-- 2) 10 neue Feature-Flags fuer externe APIs
-- ============================================================
-- Muster identisch zu Migration 086: enabled=false, enabled_quarters=[],
-- keine required_roles/plans (Warnungen sind fuer alle verifizierten
-- Mitglieder verfuegbar; Gate nur ueber Flag-Status).
--
-- Admin-Override sinnvoll fuer Staging-Tests ohne Quartier-Freischaltung.
-- ON CONFLICT DO NOTHING garantiert Idempotenz bei Re-Apply.
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

-- ============================================================
-- Verifikation nach Anwendung
-- ============================================================
-- 1) Neue quarters-Spalten vorhanden?
--    SELECT column_name, data_type
--      FROM information_schema.columns
--     WHERE table_name = 'quarters'
--       AND column_name IN ('bbk_ars', 'bw_ars');
--    Erwartet: 2 Zeilen, beide text.
--
-- 2) Bad Saeckingen mit ARS versehen?
--    SELECT slug, bbk_ars, bw_ars FROM quarters WHERE slug = 'bad-saeckingen-pilot';
--    Erwartet: ('bad-saeckingen-pilot', '08337007', '08337007')
--
-- 3) Alle 10 Flags eingefuegt und deaktiviert?
--    SELECT "key", enabled, admin_override
--      FROM feature_flags
--     WHERE "key" LIKE '%NINA%' OR "key" LIKE '%DWD%' OR "key" LIKE '%UBA%'
--        OR "key" LIKE '%DELFI%' OR "key" LIKE '%LGL_BW%' OR "key" LIKE '%OSM_POI%'
--        OR "key" LIKE '%BKG%'  OR "key" LIKE '%BFARM%' OR "key" LIKE '%DIGA%'
--        OR "key" LIKE '%GKV_CARE%'
--    ORDER BY "key";
--    Erwartet: 10 Zeilen, alle enabled=false, admin_override=true.
--
-- Rollback (falls noetig):
--   BEGIN;
--   DELETE FROM feature_flags WHERE "key" IN (
--     'NINA_WARNINGS_ENABLED','DWD_WEATHER_WARNINGS_ENABLED','UBA_AIR_QUALITY_ENABLED',
--     'DELFI_OEPNV_ENABLED','LGL_BW_BUILDING_OUTLINES_ENABLED','OSM_POI_LAYER_ENABLED',
--     'BKG_GEOCODER_FALLBACK_ENABLED','BFARM_DRUGS_ENABLED','DIGA_REGISTRY_ENABLED',
--     'GKV_CARE_REGISTRY_ENABLED'
--   );
--   DROP INDEX IF EXISTS idx_quarters_bbk_ars;
--   ALTER TABLE quarters DROP COLUMN IF EXISTS bbk_ars;
--   ALTER TABLE quarters DROP COLUMN IF EXISTS bw_ars;
--   COMMIT;
