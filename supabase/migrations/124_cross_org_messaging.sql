-- ============================================================
-- Migration 124: Cross-Org Messaging (Nachbar-Gemeinden)
-- ============================================================

-- 1. org_neighbors — Nachbarschaftsbeziehungen
CREATE TABLE org_neighbors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_a_id UUID NOT NULL REFERENCES civic_organizations(id) ON DELETE CASCADE,
  org_b_id UUID NOT NULL REFERENCES civic_organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('suggested', 'pending', 'confirmed', 'rejected')),
  distance_km NUMERIC(6,2),
  requested_by UUID REFERENCES auth.users(id),
  confirmed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_a_id, org_b_id),
  CHECK (org_a_id <> org_b_id)
);

CREATE INDEX idx_org_neighbors_a ON org_neighbors(org_a_id);
CREATE INDEX idx_org_neighbors_b ON org_neighbors(org_b_id);
CREATE INDEX idx_org_neighbors_status ON org_neighbors(status);

ALTER TABLE org_neighbors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "neighbors_select" ON org_neighbors FOR SELECT USING (
  org_a_id IN (SELECT org_id FROM civic_members WHERE user_id = auth.uid())
  OR org_b_id IN (SELECT org_id FROM civic_members WHERE user_id = auth.uid())
);

CREATE POLICY "neighbors_update" ON org_neighbors FOR UPDATE USING (
  org_a_id IN (SELECT org_id FROM civic_members WHERE user_id = auth.uid() AND role = 'civic_admin')
  OR org_b_id IN (SELECT org_id FROM civic_members WHERE user_id = auth.uid() AND role = 'civic_admin')
);

-- 2. cross_org_requests — Anfragen fuer nicht-Krisen
CREATE TABLE cross_org_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_org_id UUID NOT NULL REFERENCES civic_organizations(id) ON DELETE CASCADE,
  target_org_id UUID NOT NULL REFERENCES civic_organizations(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL
    CHECK (request_type IN ('announcement', 'event', 'survey', 'construction')),
  source_item_id UUID NOT NULL,
  original_content JSONB NOT NULL,
  modified_content JSONB,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'modified', 'rejected', 'expired', 'archived')),
  modified_by UUID REFERENCES auth.users(id),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '48 hours'),
  archived_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cross_org_requests_source ON cross_org_requests(source_org_id);
CREATE INDEX idx_cross_org_requests_target ON cross_org_requests(target_org_id);
CREATE INDEX idx_cross_org_requests_status ON cross_org_requests(status);
CREATE INDEX idx_cross_org_requests_expires ON cross_org_requests(expires_at)
  WHERE status = 'pending';

ALTER TABLE cross_org_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "requests_select" ON cross_org_requests FOR SELECT USING (
  source_org_id IN (SELECT org_id FROM civic_members WHERE user_id = auth.uid())
  OR target_org_id IN (SELECT org_id FROM civic_members WHERE user_id = auth.uid())
);

CREATE POLICY "requests_insert" ON cross_org_requests FOR INSERT WITH CHECK (
  source_org_id IN (
    SELECT org_id FROM civic_members
    WHERE user_id = auth.uid() AND role IN ('civic_admin', 'civic_editor')
  )
);

CREATE POLICY "requests_update" ON cross_org_requests FOR UPDATE USING (
  target_org_id IN (
    SELECT org_id FROM civic_members
    WHERE user_id = auth.uid() AND role = 'civic_admin'
  )
);

-- 3. cross_org_deliveries — Zugestellte Weiterleitungen
CREATE TABLE cross_org_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES cross_org_requests(id),
  source_org_id UUID NOT NULL REFERENCES civic_organizations(id),
  target_org_id UUID NOT NULL REFERENCES civic_organizations(id),
  item_type TEXT NOT NULL
    CHECK (item_type IN ('crisis', 'announcement', 'event', 'survey', 'construction')),
  source_item_id UUID NOT NULL,
  display_content JSONB NOT NULL,
  source_org_name TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_by_org_name TEXT,
  hop_count INTEGER NOT NULL DEFAULT 1
    CHECK (hop_count <= 2),
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cross_org_deliveries_target ON cross_org_deliveries(target_org_id);
CREATE INDEX idx_cross_org_deliveries_source ON cross_org_deliveries(source_org_id);
CREATE INDEX idx_cross_org_deliveries_type ON cross_org_deliveries(item_type);

ALTER TABLE cross_org_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deliveries_select" ON cross_org_deliveries FOR SELECT USING (
  target_org_id IN (SELECT org_id FROM civic_members WHERE user_id = auth.uid())
  OR source_org_id IN (
    SELECT org_id FROM civic_members
    WHERE user_id = auth.uid() AND role = 'civic_admin'
  )
);
