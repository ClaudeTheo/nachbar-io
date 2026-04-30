-- Migration 114: Nachbar.io Civic-Portal — Alle Tabellen + RLS
-- Rathaus-Portal fuer Kommunen, Behoerden, Sozialstationen

-- ============================================================
-- 1. civic_organizations — Registrierte Organisationen
-- ============================================================
CREATE TABLE IF NOT EXISTS civic_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'kommune',
  municipality text,
  hr_vr_number text,
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  features jsonb NOT NULL DEFAULT '{
    "baustellen": true,
    "maengelmelder": true,
    "bekanntmachungen": true,
    "krisen_push": true,
    "veranstaltungen": false,
    "umfragen": false,
    "terminbuchung": false,
    "dokumente": false,
    "eid_verifizierung": false,
    "nina_warnungen": false,
    "dwd_wetter": false,
    "pegelonline": false,
    "fit_connect": false
  }'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE civic_organizations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. civic_members — Mitgliedschaften (User ↔ Organisation)
-- Muss vor den civic_organizations-Policies existieren.
-- ============================================================
CREATE TABLE IF NOT EXISTS civic_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES civic_organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'civic_viewer'
    CHECK (role IN ('civic_admin', 'civic_editor', 'civic_viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

ALTER TABLE civic_members ENABLE ROW LEVEL SECURITY;

-- Mitglieder duerfen ihre eigene Organisation lesen
CREATE POLICY "civic_org_select" ON civic_organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM civic_members WHERE user_id = auth.uid())
  );

-- Nur civic_admin darf Organisation aktualisieren
CREATE POLICY "civic_org_update" ON civic_organizations
  FOR UPDATE USING (
    id IN (
      SELECT org_id FROM civic_members
      WHERE user_id = auth.uid() AND role = 'civic_admin'
    )
  );

-- Service-Role fuer Registrierung (INSERT ohne RLS)
CREATE POLICY "civic_org_service_insert" ON civic_organizations
  FOR INSERT WITH CHECK (true);

-- Nutzer sieht eigene Mitgliedschaft
CREATE POLICY "civic_members_select_own" ON civic_members
  FOR SELECT USING (user_id = auth.uid());

-- Admins sehen alle Mitglieder ihrer Organisation
CREATE POLICY "civic_members_select_org" ON civic_members
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM civic_members
      WHERE user_id = auth.uid() AND role = 'civic_admin'
    )
  );

-- Service-Role fuer Registrierung
CREATE POLICY "civic_members_service_insert" ON civic_members
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- 3. construction_sites — Baustellen-Melder
-- ============================================================
CREATE TABLE IF NOT EXISTS construction_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES civic_organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  start_date date NOT NULL,
  end_date date,
  detour_info text,
  contact_name text,
  contact_phone text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'planned', 'completed')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE construction_sites ENABLE ROW LEVEL SECURITY;

-- Alle authentifizierten Nutzer duerfen lesen (oeffentliche Daten)
CREATE POLICY "construction_sites_select" ON construction_sites
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Editor/Admin der gleichen Org darf erstellen
CREATE POLICY "construction_sites_insert" ON construction_sites
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM civic_members
      WHERE user_id = auth.uid() AND role IN ('civic_admin', 'civic_editor')
    )
  );

-- Editor/Admin der gleichen Org darf aktualisieren
CREATE POLICY "construction_sites_update" ON construction_sites
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM civic_members
      WHERE user_id = auth.uid() AND role IN ('civic_admin', 'civic_editor')
    )
  );

-- ============================================================
-- 4. citizen_reports — Maengelmelder (Buerger-Meldungen)
-- ============================================================
CREATE TABLE IF NOT EXISTS citizen_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES civic_organizations(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'sonstiges',
  title text NOT NULL,
  description text,
  latitude double precision,
  longitude double precision,
  photo_url text,
  status text NOT NULL DEFAULT 'offen'
    CHECK (status IN ('offen', 'in_bearbeitung', 'erledigt', 'abgelehnt')),
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('niedrig', 'normal', 'hoch', 'dringend')),
  assigned_to text,
  internal_notes text,
  resolved_at timestamptz,
  reported_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE citizen_reports ENABLE ROW LEVEL SECURITY;

-- Civic-Mitglieder duerfen lesen
CREATE POLICY "citizen_reports_select" ON citizen_reports
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Buerger duerfen melden (INSERT)
CREATE POLICY "citizen_reports_insert" ON citizen_reports
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Nur Org-Mitglieder duerfen aktualisieren
CREATE POLICY "citizen_reports_update" ON citizen_reports
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM civic_members
      WHERE user_id = auth.uid() AND role IN ('civic_admin', 'civic_editor')
    )
  );

-- ============================================================
-- 5. civic_announcements — Bekanntmachungen
-- ============================================================
CREATE TABLE IF NOT EXISTS civic_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES civic_organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'info'
    CHECK (category IN ('amtlich', 'info', 'warnung', 'veranstaltung', 'baustelle')),
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('niedrig', 'normal', 'hoch', 'dringend')),
  published_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE civic_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "civic_announcements_select" ON civic_announcements
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "civic_announcements_insert" ON civic_announcements
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM civic_members
      WHERE user_id = auth.uid() AND role IN ('civic_admin', 'civic_editor')
    )
  );

CREATE POLICY "civic_announcements_update" ON civic_announcements
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM civic_members
      WHERE user_id = auth.uid() AND role IN ('civic_admin', 'civic_editor')
    )
  );

-- ============================================================
-- 6. crisis_alerts — Krisen-Kommunikation
-- ============================================================
CREATE TABLE IF NOT EXISTS crisis_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES civic_organizations(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'sonstiges',
  severity text NOT NULL DEFAULT 'mittel'
    CHECK (severity IN ('niedrig', 'mittel', 'hoch', 'kritisch')),
  title text NOT NULL,
  message text NOT NULL,
  instructions text,
  affected_quarters text[],
  active boolean NOT NULL DEFAULT true,
  deactivated_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crisis_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crisis_alerts_select" ON crisis_alerts
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Nur Admins duerfen Krisen-Alerts erstellen
CREATE POLICY "crisis_alerts_insert" ON crisis_alerts
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM civic_members
      WHERE user_id = auth.uid() AND role = 'civic_admin'
    )
  );

CREATE POLICY "crisis_alerts_update" ON crisis_alerts
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM civic_members
      WHERE user_id = auth.uid() AND role = 'civic_admin'
    )
  );

-- ============================================================
-- 7. crisis_templates — Vorlagen fuer Krisen-Alerts
-- ============================================================
CREATE TABLE IF NOT EXISTS crisis_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  instructions text,
  severity text NOT NULL DEFAULT 'hoch',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crisis_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crisis_templates_select" ON crisis_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Standard-Vorlagen einfuegen
INSERT INTO crisis_templates (type, title, message, instructions, severity) VALUES
  ('hochwasser', 'Hochwasserwarnung', 'Für Ihr Gebiet wurde eine Hochwasserwarnung herausgegeben.', 'Vermeiden Sie Kellerräume. Sichern Sie wertvolle Gegenstände. Folgen Sie den Anweisungen der Einsatzkräfte.', 'hoch'),
  ('sturm', 'Sturmwarnung', 'Für Ihr Gebiet wurde eine Sturmwarnung herausgegeben.', 'Bleiben Sie in Gebäuden. Schließen Sie Fenster und Türen. Meiden Sie Bäume und offene Flächen.', 'hoch'),
  ('stromausfall', 'Stromausfall', 'In Ihrem Gebiet ist ein großflächiger Stromausfall aufgetreten.', 'Nutzen Sie Taschenlampen statt Kerzen. Öffnen Sie Kühlschränke nur bei Bedarf. Notruf 112 ist erreichbar.', 'mittel'),
  ('evakuierung', 'Evakuierungsanordnung', 'Für Ihr Gebiet wurde eine Evakuierung angeordnet.', 'Folgen Sie den markierten Evakuierungsrouten. Nehmen Sie wichtige Dokumente mit. Sammelstelle wird bekannt gegeben.', 'kritisch'),
  ('brand', 'Großbrand', 'In Ihrem Gebiet wurde ein Großbrand gemeldet.', 'Halten Sie Fenster geschlossen. Folgen Sie den Anweisungen der Feuerwehr. Rufen Sie 112 bei Gefahr.', 'hoch')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 8. civic_surveys — Buerger-Umfragen
-- ============================================================
CREATE TABLE IF NOT EXISTS civic_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  anonymous boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE civic_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "civic_surveys_select" ON civic_surveys
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "civic_surveys_insert" ON civic_surveys
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "civic_surveys_delete" ON civic_surveys
  FOR DELETE USING (created_by = auth.uid());

-- ============================================================
-- 9. civic_survey_options — Umfrage-Optionen
-- ============================================================
CREATE TABLE IF NOT EXISTS civic_survey_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES civic_surveys(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  vote_count int NOT NULL DEFAULT 0
);

ALTER TABLE civic_survey_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "civic_survey_options_select" ON civic_survey_options
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "civic_survey_options_insert" ON civic_survey_options
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 10. civic_survey_votes — Abstimmungen
-- ============================================================
CREATE TABLE IF NOT EXISTS civic_survey_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES civic_surveys(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES civic_survey_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (survey_id, user_id)
);

ALTER TABLE civic_survey_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "civic_survey_votes_select" ON civic_survey_votes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "civic_survey_votes_insert" ON civic_survey_votes
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 11. civic_events — Veranstaltungskalender
-- ============================================================
CREATE TABLE IF NOT EXISTS civic_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  event_time text,
  location text,
  category text NOT NULL DEFAULT 'sonstiges'
    CHECK (category IN ('kultur', 'sport', 'markt', 'politik', 'bildung', 'gesundheit', 'sonstiges')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE civic_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "civic_events_select" ON civic_events
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "civic_events_insert" ON civic_events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 12. civic_appointments — Rathaus-Terminbuchung
-- ============================================================
CREATE TABLE IF NOT EXISTS civic_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_name text NOT NULL,
  department text,
  service_type text,
  scheduled_at timestamptz NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'angefragt'
    CHECK (status IN ('angefragt', 'bestaetigt', 'storniert', 'abgeschlossen')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE civic_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "civic_appointments_select" ON civic_appointments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "civic_appointments_insert" ON civic_appointments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "civic_appointments_update" ON civic_appointments
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 13. civic_document_requests — Dokumenten-Anforderung
-- ============================================================
CREATE TABLE IF NOT EXISTS civic_document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL,
  citizen_name text NOT NULL,
  citizen_email text,
  details text,
  status text NOT NULL DEFAULT 'beantragt'
    CHECK (status IN ('beantragt', 'in_bearbeitung', 'fertig', 'abgeholt')),
  requested_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE civic_document_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "civic_document_requests_select" ON civic_document_requests
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "civic_document_requests_insert" ON civic_document_requests
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "civic_document_requests_update" ON civic_document_requests
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 14. warning_cache — NINA + DWD + PEGELONLINE Cache
-- ============================================================
CREATE TABLE IF NOT EXISTS warning_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('nina', 'dwd', 'pegelonline')),
  external_id text NOT NULL,
  severity text NOT NULL DEFAULT 'unknown',
  title text NOT NULL,
  description text,
  instructions text,
  onset timestamptz,
  expires timestamptz,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE warning_cache ENABLE ROW LEVEL SECURITY;

-- Alle authentifizierten Nutzer duerfen Warnungen lesen
CREATE POLICY "warning_cache_select" ON warning_cache
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Service-Role fuer Cron-Job (INSERT/DELETE)
CREATE POLICY "warning_cache_service_insert" ON warning_cache
  FOR INSERT WITH CHECK (true);

CREATE POLICY "warning_cache_service_delete" ON warning_cache
  FOR DELETE USING (true);

-- ============================================================
-- 15. civic_audit_log — Audit-Protokoll (BSI-konform)
-- ============================================================
CREATE TABLE IF NOT EXISTS civic_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES civic_organizations(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE civic_audit_log ENABLE ROW LEVEL SECURITY;

-- Mitglieder duerfen Audit-Log ihrer Organisation lesen
CREATE POLICY "civic_audit_log_select" ON civic_audit_log
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM civic_members WHERE user_id = auth.uid())
  );

-- Service-Role fuer Schreiben (writeAuditLog nutzt Service-Client)
CREATE POLICY "civic_audit_log_service_insert" ON civic_audit_log
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- Indizes fuer Performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_civic_members_user ON civic_members(user_id);
CREATE INDEX IF NOT EXISTS idx_civic_members_org ON civic_members(org_id);
CREATE INDEX IF NOT EXISTS idx_construction_sites_org ON construction_sites(org_id);
CREATE INDEX IF NOT EXISTS idx_citizen_reports_status ON citizen_reports(status);
CREATE INDEX IF NOT EXISTS idx_civic_announcements_org ON civic_announcements(org_id);
CREATE INDEX IF NOT EXISTS idx_crisis_alerts_active ON crisis_alerts(active);
CREATE INDEX IF NOT EXISTS idx_civic_surveys_dates ON civic_surveys(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_civic_events_date ON civic_events(event_date);
CREATE INDEX IF NOT EXISTS idx_civic_appointments_scheduled ON civic_appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_civic_document_requests_status ON civic_document_requests(status);
CREATE INDEX IF NOT EXISTS idx_warning_cache_source ON warning_cache(source);
CREATE INDEX IF NOT EXISTS idx_civic_audit_log_org ON civic_audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_civic_audit_log_created ON civic_audit_log(created_at);
