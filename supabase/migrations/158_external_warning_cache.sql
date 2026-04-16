-- Migration 158: external_warning_cache — Snapshots fuer NINA/DWD/UBA
--
-- STATUS: ENTWURF — NICHT ANGEWENDET
-- Plan-Dokument: docs/plans/2026-04-17-nina-dwd-integration.md
-- Handoff:       docs/plans/2026-04-16-external-apis-research-handoff.md
--
-- Zweck:
--   Zentrale Cache-Tabelle fuer externe Warnungen (NINA, DWD, UBA).
--   Cron-Job zieht alle 10-15 Min pro aktivem Quartier, normalisiert die
--   Payloads und schreibt hier. Frontend liest ausschliesslich aus dieser
--   Tabelle — nie direkt gegen die externen Endpunkte. Das entkoppelt UI
--   von API-Ausfaellen und reduziert Rate-Limit-Druck drastisch.
--
-- Architektur-Prinzip (aus Handoff Abschnitt 0):
--   „Alle externen APIs hinter feature_flags". Diese Tabelle ist nur
--   Datenspeicher, das Gating erfolgt beim Lesepfad via
--   checkFeatureAccess() + der passende Flag-Key pro Provider.
--
-- DSGVO:
--   Keine personenbezogenen Daten. Amtliche Warnungen sind public-domain-
--   nahe oeffentliche Informationen. RLS erlaubt daher allen
--   authentifizierten Nutzern Lesezugriff; Write ist auf service_role +
--   Admins beschraenkt.
--
-- Attribution-Pflicht (Founder-Entscheidung 2, 2026-04-16):
--   Jede Zeile MUSS `attribution_text` gefuellt haben — NOT NULL.
--   UI zeigt den Text als kleine Fusszeile pro Warnung + Link auf
--   die neue Public-Seite `/datenquellen` (Task 16 im Plan).
--
-- Apply-Weg: MCP apply_migration, strikt NACH Migration 157
-- (Founder-Entscheidung 4).

BEGIN;

-- ============================================================
-- Enums: Provider + Severity + Status
-- ============================================================
DO $$ BEGIN
  CREATE TYPE external_warning_provider AS ENUM (
    'nina',   -- BBK NINA
    'dwd',    -- Deutscher Wetterdienst CAP
    'uba'     -- Umweltbundesamt Luftqualitaet
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  -- CAP 1.2 Severity Levels
  CREATE TYPE external_warning_severity AS ENUM (
    'minor',     -- Informativ
    'moderate',  -- Vorsicht
    'severe',    -- Gefahr
    'extreme',   -- Lebensgefahr
    'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE external_warning_status AS ENUM (
    'active',      -- Warnung laeuft, expires_at > now()
    'superseded',  -- Von neuerer Version ersetzt (gleiche external_id)
    'expired',     -- expires_at vergangen, Cleanup laeuft im naechsten Cron
    'cancelled'    -- Vom Provider aktiv zurueckgezogen
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Tabelle: external_warning_cache
-- ============================================================
CREATE TABLE external_warning_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Herkunft
  provider external_warning_provider NOT NULL,
  external_id TEXT NOT NULL,             -- NINA ID bzw. DWD identifier
  external_version TEXT,                 -- CAP <sent> timestamp, dient als Versionszaehler
  -- Beispiel NINA: 'mow.DE-BBK-W-1234567'
  -- Beispiel DWD:  '2.49.0.0.276.0.DWD.PVW.1712345678901.abc'

  -- Geographischer Scope
  -- Ein Warnung kann einem Quartier direkt zugeordnet sein (bevorzugt) ODER
  -- einem AGS/ARS (wenn sie noch nicht auf Quartier-Ebene gematcht wurde).
  -- Der Cron schreibt initial `ars` und matched spaeter an `quarter_id`.
  quarter_id UUID REFERENCES quarters(id) ON DELETE CASCADE,
  ars TEXT,                              -- ARS/AGS (12 oder 8 stellig)
  warncell_id TEXT,                      -- DWD WarnCellID (nur fuer DWD)

  -- Inhaltliche Felder (normalisiert aus CAP/JSON)
  headline TEXT NOT NULL,                -- Titel, max 500 char (app-seitig gekuerzt bei Anzeige)
  description TEXT,                      -- Volltext
  instruction TEXT,                      -- Handlungsempfehlung (z.B. „Fenster schliessen")
  severity external_warning_severity NOT NULL DEFAULT 'unknown',
  category TEXT,                         -- CAP category: Met, Safety, Security, Health, ...
  event_code TEXT,                       -- z.B. DWD event code 'HITZE_STARK'

  -- Zeitraum
  onset_at TIMESTAMPTZ,                  -- Beginn der Gueltigkeit
  expires_at TIMESTAMPTZ,                -- Ende der Gueltigkeit
  sent_at TIMESTAMPTZ,                   -- Ausgabe-Zeitpunkt beim Provider

  -- Status + Lifecycle
  status external_warning_status NOT NULL DEFAULT 'active',
  superseded_by UUID REFERENCES external_warning_cache(id),

  -- Raw-Payload fuer Debugging + kuenftige Felder
  raw_payload JSONB NOT NULL,

  -- Attribution (Pflicht, damit Frontend nie ungequellte Daten anzeigt)
  attribution_text TEXT NOT NULL,
  -- Beispielwerte:
  --   NINA: 'Quelle: Bundesamt fuer Bevoelkerungsschutz und Katastrophenhilfe (BBK)'
  --   DWD:  'Quelle: Deutscher Wetterdienst (DWD)'
  --   UBA:  'Quelle: Umweltbundesamt (UBA), dl-de/by-2-0'
  attribution_url TEXT,

  -- Sync-Tracking
  fetch_batch_id UUID,                   -- Gruppiert alle Warnungen eines Cron-Runs
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Eine Warnung pro (Provider, external_id, external_version).
  -- Spaetere Versionen derselben external_id werden als neue Zeile
  -- eingefuegt; alte Zeile bekommt status='superseded' + superseded_by.
  --
  -- WICHTIG: NULLS NOT DISTINCT (Postgres 15+). Ohne diesen Zusatz
  -- wuerde Postgres NULL != NULL behandeln und zwei Zeilen mit
  -- external_version=NULL NICHT als Konflikt erkennen — das fuehrt
  -- zu Duplikaten, wenn ein Provider keine Versionsangabe liefert.
  -- Supabase laeuft Postgres 15.x, `NULLS NOT DISTINCT` ist verfuegbar.
  CONSTRAINT external_warning_cache_unique
    UNIQUE NULLS NOT DISTINCT (provider, external_id, external_version)
);

-- Index-Strategie: Hot-Path ist „gib mir alle aktiven Warnungen fuer Quartier X".
CREATE INDEX idx_ewc_quarter_active
  ON external_warning_cache(quarter_id, status, expires_at)
  WHERE status = 'active';

-- Fallback-Index: noch nicht zu Quartier gematcht, per ARS auffindbar
CREATE INDEX idx_ewc_ars_active
  ON external_warning_cache(ars, status, expires_at)
  WHERE status = 'active' AND ars IS NOT NULL;

-- Provider-Filter fuer Admin-UI
CREATE INDEX idx_ewc_provider_sent
  ON external_warning_cache(provider, sent_at DESC);

-- Cleanup-Cron findet abgelaufene schnell
CREATE INDEX idx_ewc_expires
  ON external_warning_cache(expires_at)
  WHERE status IN ('active', 'superseded');

-- updated_at Trigger
CREATE TRIGGER external_warning_cache_updated_at
  BEFORE UPDATE ON external_warning_cache
  FOR EACH ROW
  EXECUTE FUNCTION care_update_updated_at();

-- ============================================================
-- RLS Policies
-- ============================================================
-- Prinzip: Warnungen sind oeffentliche amtliche Daten. Alle
-- authentifizierten Nutzer duerfen lesen. Schreiben ist auf
-- service_role (Cron) und Admin (manuelles Pflegen/Testen) beschraenkt.
ALTER TABLE external_warning_cache ENABLE ROW LEVEL SECURITY;

-- SELECT: Alle authentifizierten Nutzer
CREATE POLICY ewc_read
  ON external_warning_cache FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Admin
CREATE POLICY ewc_insert_admin
  ON external_warning_cache FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- UPDATE: Admin
CREATE POLICY ewc_update_admin
  ON external_warning_cache FOR UPDATE
  TO authenticated
  USING (is_admin());

-- DELETE: Admin (nur fuer Test/Cleanup; Produktion nutzt status='expired')
CREATE POLICY ewc_delete_admin
  ON external_warning_cache FOR DELETE
  TO authenticated
  USING (is_admin());

-- service_role: Voller Zugriff fuer Cron/Edge-Functions
CREATE POLICY ewc_service
  ON external_warning_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Hilfstabelle: external_warning_sync_log
-- ============================================================
-- Protokolliert jeden Cron-Run pro Provider + Quartier. Wichtig fuer:
-- - Beobachten ob NINA/DWD tatsaechlich alle 10 Min antwortet
-- - Debugging von Rate-Limits
-- - Fehler-Alerts wenn ein Provider 3x in Folge fehlschlaegt
CREATE TABLE external_warning_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL DEFAULT gen_random_uuid(),

  provider external_warning_provider NOT NULL,
  quarter_id UUID REFERENCES quarters(id) ON DELETE CASCADE,
  ars TEXT,

  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status sync_status NOT NULL DEFAULT 'running',  -- reused from Migration 102

  warnings_fetched INT DEFAULT 0,
  warnings_new INT DEFAULT 0,
  warnings_updated INT DEFAULT 0,
  warnings_unchanged INT DEFAULT 0,
  warnings_expired INT DEFAULT 0,

  http_status INT,
  error_message TEXT,
  error_details JSONB
);

CREATE INDEX idx_ewsl_provider_started
  ON external_warning_sync_log(provider, started_at DESC);

CREATE INDEX idx_ewsl_quarter_started
  ON external_warning_sync_log(quarter_id, started_at DESC)
  WHERE quarter_id IS NOT NULL;

-- RLS auf sync_log: Nur Admin + service_role
ALTER TABLE external_warning_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY ewsl_admin
  ON external_warning_sync_log FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY ewsl_service
  ON external_warning_sync_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;

-- ============================================================
-- Verifikation nach Anwendung
-- ============================================================
-- 1) Tabellen existieren + RLS aktiv?
--    SELECT tablename, rowsecurity FROM pg_tables
--     WHERE tablename IN ('external_warning_cache','external_warning_sync_log');
--    Erwartet: 2 Zeilen, rowsecurity=true.
--
-- 2) Enums existieren?
--    SELECT typname FROM pg_type
--     WHERE typname IN ('external_warning_provider','external_warning_severity','external_warning_status');
--    Erwartet: 3 Zeilen.
--
-- 3) Policies existieren?
--    SELECT policyname, cmd FROM pg_policies
--     WHERE tablename = 'external_warning_cache'
--     ORDER BY policyname;
--    Erwartet: ewc_read (SELECT), ewc_insert_admin (INSERT), ewc_update_admin (UPDATE),
--              ewc_delete_admin (DELETE), ewc_service (ALL).
--
-- 4) Indizes existieren?
--    SELECT indexname FROM pg_indexes
--     WHERE tablename = 'external_warning_cache'
--     ORDER BY indexname;
--    Erwartet: idx_ewc_quarter_active, idx_ewc_ars_active, idx_ewc_provider_sent, idx_ewc_expires
--
-- 5) Smoke-Test als service_role:
--    INSERT INTO external_warning_cache (
--      provider, external_id, headline, severity, raw_payload, attribution_text
--    ) VALUES (
--      'nina', 'smoke-test-1', 'Smoke-Test', 'minor', '{}'::jsonb,
--      'Quelle: Bundesamt fuer Bevoelkerungsschutz und Katastrophenhilfe (BBK)'
--    );
--    DELETE FROM external_warning_cache WHERE external_id = 'smoke-test-1';
--
-- Rollback (falls noetig):
--   BEGIN;
--   DROP TABLE IF EXISTS external_warning_sync_log;
--   DROP TABLE IF EXISTS external_warning_cache;
--   DROP TYPE IF EXISTS external_warning_status;
--   DROP TYPE IF EXISTS external_warning_severity;
--   DROP TYPE IF EXISTS external_warning_provider;
--   COMMIT;
