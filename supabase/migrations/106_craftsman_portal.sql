-- Migration 106: Handwerker-Empfehlungsportal
-- Design-Dokument: docs/plans/2026-03-20-handwerker-portal-design.md

-- ============================================================
-- 1. Neue Spalten auf community_tips
-- ============================================================
ALTER TABLE community_tips ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE community_tips ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE community_tips ADD COLUMN IF NOT EXISTS service_area TEXT;
ALTER TABLE community_tips ADD COLUMN IF NOT EXISTS service_radius_km INT;
ALTER TABLE community_tips ADD COLUMN IF NOT EXISTS subcategories TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_ct_subcategories ON community_tips USING GIN (subcategories)
  WHERE category = 'craftsmen';
CREATE INDEX IF NOT EXISTS idx_ct_service_radius ON community_tips(service_radius_km)
  WHERE category = 'craftsmen';

-- ============================================================
-- 2. craftsman_recommendations (Empfehlungsschicht)
-- ============================================================
CREATE TABLE IF NOT EXISTS craftsman_recommendations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_id          UUID NOT NULL REFERENCES community_tips(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommends      BOOLEAN NOT NULL,
  confirmed_usage BOOLEAN NOT NULL DEFAULT false,
  aspects         JSONB,
  comment         TEXT CHECK (char_length(comment) <= 500),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tip_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cr_tip ON craftsman_recommendations(tip_id);
CREATE INDEX IF NOT EXISTS idx_cr_user ON craftsman_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_cr_recommends ON craftsman_recommendations(tip_id, recommends)
  WHERE recommends = true;

-- RLS
ALTER TABLE craftsman_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cr_read" ON craftsman_recommendations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM household_members hm
    WHERE hm.user_id = auth.uid() AND hm.verified_at IS NOT NULL
  )
);

CREATE POLICY "cr_insert" ON craftsman_recommendations FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid() AND u.created_at < now() - INTERVAL '7 days'
  )
  AND NOT EXISTS (
    SELECT 1 FROM community_tips ct
    WHERE ct.id = tip_id AND ct.user_id = auth.uid()
  )
);

CREATE POLICY "cr_update" ON craftsman_recommendations FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "cr_delete" ON craftsman_recommendations FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- 3. craftsman_usage_events (Nutzungsschicht)
-- ============================================================
CREATE TABLE IF NOT EXISTS craftsman_usage_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_id     UUID NOT NULL REFERENCES community_tips(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  note       TEXT CHECK (char_length(note) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cue_tip ON craftsman_usage_events(tip_id);
CREATE INDEX IF NOT EXISTS idx_cue_user ON craftsman_usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_cue_recency ON craftsman_usage_events(tip_id, used_at DESC);

-- RLS
ALTER TABLE craftsman_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cue_read" ON craftsman_usage_events FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM household_members hm
    WHERE hm.user_id = auth.uid() AND hm.verified_at IS NOT NULL
  )
);

CREATE POLICY "cue_insert" ON craftsman_usage_events FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY "cue_delete" ON craftsman_usage_events FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- 4. Feature-Flag
-- ============================================================
INSERT INTO feature_flags (key, enabled, required_roles, required_plans, description)
VALUES ('HANDWERKER_PORTAL', true, '{}', '{}',
        'Handwerker-Empfehlungsportal mit Nachbarschafts-Trust')
ON CONFLICT (key) DO NOTHING;
