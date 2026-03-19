-- ============================================================
-- Nachbar.io — Migration 087: Analytics Snapshots
-- Taeglich berechnete KPI-Snapshots pro Quartier
-- Basis fuer das KPI-Dashboard (Task 6.1)
-- ============================================================

-- Tabelle: analytics_snapshots — Taegliche KPI-Momentaufnahme pro Quartier
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter_id UUID NOT NULL REFERENCES quarters(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- North Star Metrik
  wah INTEGER NOT NULL DEFAULT 0,

  -- Consumer-Metriken
  total_users INTEGER NOT NULL DEFAULT 0,
  active_users_7d INTEGER NOT NULL DEFAULT 0,
  active_users_30d INTEGER NOT NULL DEFAULT 0,
  new_registrations INTEGER NOT NULL DEFAULT 0,
  activation_rate NUMERIC(5,2) DEFAULT 0,
  retention_7d NUMERIC(5,2) DEFAULT 0,
  retention_30d NUMERIC(5,2) DEFAULT 0,
  invite_sent INTEGER NOT NULL DEFAULT 0,
  invite_converted INTEGER NOT NULL DEFAULT 0,
  invite_conversion_rate NUMERIC(5,2) DEFAULT 0,
  posts_count INTEGER NOT NULL DEFAULT 0,
  events_count INTEGER NOT NULL DEFAULT 0,
  rsvp_count INTEGER NOT NULL DEFAULT 0,

  -- Angehoerige-Metriken
  plus_subscribers INTEGER NOT NULL DEFAULT 0,
  heartbeat_coverage NUMERIC(5,2) DEFAULT 0,
  checkin_frequency NUMERIC(5,2) DEFAULT 0,
  escalation_count INTEGER NOT NULL DEFAULT 0,

  -- B2B-Metriken
  active_orgs INTEGER NOT NULL DEFAULT 0,

  -- Revenue-Metriken
  mrr NUMERIC(10,2) DEFAULT 0,

  -- Zeitstempel
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Pro Quartier + Tag nur ein Snapshot
  UNIQUE(quarter_id, snapshot_date)
);

-- Index fuer schnelle Abfragen nach Quartier + Datum (neueste zuerst)
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_quarter_date
  ON analytics_snapshots (quarter_id, snapshot_date DESC);

-- RLS aktivieren
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- Lesen: Admins, Quarter-Admins, Org-Admins und Org-Viewer
CREATE POLICY "analytics_snapshots_read_admin" ON analytics_snapshots
  FOR SELECT USING (is_admin());

CREATE POLICY "analytics_snapshots_read_quarter_admin" ON analytics_snapshots
  FOR SELECT USING (is_quarter_admin_for(quarter_id));

-- Org-Members (Pro Community) duerfen Snapshots ihrer Quartiere lesen
CREATE POLICY "analytics_snapshots_read_org_member" ON analytics_snapshots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM org_members om
      JOIN organizations o ON o.id = om.org_id
      WHERE om.user_id = auth.uid()
        AND quarter_id = ANY(om.assigned_quarters)
        AND o.verification_status = 'verified'
    )
  );

-- Schreiben: Nur service_role (Cron-Job), kein Client-Zugriff
CREATE POLICY "analytics_snapshots_insert_deny" ON analytics_snapshots
  FOR INSERT WITH CHECK (false);

CREATE POLICY "analytics_snapshots_update_deny" ON analytics_snapshots
  FOR UPDATE USING (false);

CREATE POLICY "analytics_snapshots_delete_deny" ON analytics_snapshots
  FOR DELETE USING (false);

-- ============================================================
-- KPI-Targets (optionale Zielwerte pro Metrik)
-- ============================================================
CREATE TABLE IF NOT EXISTS kpi_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter_id UUID NOT NULL REFERENCES quarters(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  target_value NUMERIC(10,2) NOT NULL,
  period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('daily', 'weekly', 'monthly', 'quarterly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(quarter_id, metric_key, period)
);

ALTER TABLE kpi_targets ENABLE ROW LEVEL SECURITY;

-- Lesen: Admins und Quarter-Admins
CREATE POLICY "kpi_targets_read_admin" ON kpi_targets
  FOR SELECT USING (is_admin());

CREATE POLICY "kpi_targets_read_quarter_admin" ON kpi_targets
  FOR SELECT USING (is_quarter_admin_for(quarter_id));

-- Schreiben: Nur Admins
CREATE POLICY "kpi_targets_manage_admin" ON kpi_targets
  FOR ALL USING (is_admin());
