-- ============================================================
-- Nachbar.io — Vollständiges Datenbank-Schema
-- PostgreSQL (Supabase) · Migration 001
-- ============================================================

-- Supabase stellt gen_random_uuid() nativ bereit (pgcrypto)
-- PostGIS wird separat in Supabase aktiviert

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    ui_mode TEXT NOT NULL DEFAULT 'active'
        CHECK (ui_mode IN ('active', 'senior')),
    trust_level TEXT NOT NULL DEFAULT 'new'
        CHECK (trust_level IN ('new', 'verified', 'trusted', 'admin')),
    is_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen TIMESTAMPTZ DEFAULT now(),
    settings JSONB DEFAULT '{}'::jsonb
);

-- ============================================================
-- HOUSEHOLDS
-- ============================================================
CREATE TABLE IF NOT EXISTS households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    street_name TEXT NOT NULL
        CHECK (street_name IN (
            'Purkersdorfer Straße',
            'Sanarystraße',
            'Oberer Rebberg'
        )),
    house_number TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT false,
    invite_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(street_name, house_number)
);

-- ============================================================
-- HOUSEHOLD_MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS household_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member'
        CHECK (role IN ('owner', 'member')),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(household_id, user_id)
);

-- ============================================================
-- ALERTS (Soforthilfe)
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    category TEXT NOT NULL
        CHECK (category IN (
            'water_damage', 'power_outage', 'door_lock', 'fall',
            'shopping', 'tech_help', 'pet', 'other'
        )),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'help_coming', 'resolved')),
    is_emergency BOOLEAN NOT NULL DEFAULT false,
    current_radius INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ
);

-- ============================================================
-- ALERT_RESPONSES
-- ============================================================
CREATE TABLE IF NOT EXISTS alert_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    responder_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    message TEXT,
    response_type TEXT NOT NULL DEFAULT 'help'
        CHECK (response_type IN ('help', 'info', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- HELP_REQUESTS (Hilfe-Börse)
-- ============================================================
CREATE TABLE IF NOT EXISTS help_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('need', 'offer')),
    category TEXT NOT NULL
        CHECK (category IN (
            'garden', 'shopping', 'transport', 'tech', 'childcare',
            'handwork', 'pet_care', 'tutoring', 'company', 'other'
        )),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'matched', 'closed')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MARKETPLACE_ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS marketplace_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('sell', 'give', 'search', 'lend')),
    category TEXT NOT NULL
        CHECK (category IN (
            'furniture', 'tools', 'kids', 'books', 'electronics',
            'clothing', 'plants', 'household', 'other'
        )),
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    images TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'reserved', 'done', 'deleted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    archived_at TIMESTAMPTZ
);

-- ============================================================
-- LOST_FOUND
-- ============================================================
CREATE TABLE IF NOT EXISTS lost_found (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('lost', 'found')),
    category TEXT NOT NULL
        CHECK (category IN (
            'pet', 'keys', 'package', 'glasses', 'wallet',
            'clothing', 'electronics', 'other'
        )),
    title TEXT NOT NULL,
    description TEXT,
    location_hint TEXT,
    images TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- ============================================================
-- NEWS_ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS news_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_url TEXT,
    original_title TEXT NOT NULL,
    ai_summary TEXT NOT NULL,
    category TEXT NOT NULL
        CHECK (category IN (
            'infrastructure', 'events', 'administration',
            'weather', 'waste', 'other'
        )),
    relevance_score INTEGER NOT NULL DEFAULT 5
        CHECK (relevance_score BETWEEN 0 AND 10),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SKILLS (Experten-Profile)
-- ============================================================
CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL
        CHECK (category IN (
            'medical', 'legal', 'electrical', 'it', 'garden',
            'handwork', 'transport', 'cooking', 'music', 'languages',
            'childcare', 'pet_care', 'other'
        )),
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- NOTIFICATIONS (In-App)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL
        CHECK (type IN (
            'alert', 'alert_response', 'help_match', 'marketplace',
            'lost_found', 'news', 'checkin_reminder', 'system'
        )),
    title TEXT NOT NULL,
    body TEXT,
    reference_id UUID,
    reference_type TEXT,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PUSH_SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ
);

-- ============================================================
-- COMMUNITY_RULES_VIOLATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS community_rules_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reporter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL,
    item_id UUID NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'reviewed', 'action_taken', 'dismissed')),
    admin_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ
);

-- ============================================================
-- SENIOR_CHECKINS
-- ============================================================
CREATE TABLE IF NOT EXISTS senior_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    contact_person_name TEXT,
    contact_person_phone TEXT
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_alerts_household ON alerts(household_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_active ON marketplace_items(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_help_requests_active ON help_requests(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_news_relevance ON news_items(relevance_score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_skills_public ON skills(category) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_found ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_rules_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE senior_checkins ENABLE ROW LEVEL SECURITY;

-- Hilfsfunktionen
CREATE OR REPLACE FUNCTION is_verified_member()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM household_members
        WHERE user_id = auth.uid()
        AND verified_at IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
CREATE POLICY "users_read_own" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_read_verified" ON users FOR SELECT USING (is_verified_member());
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "households_read" ON households FOR SELECT USING (is_verified_member());
CREATE POLICY "households_admin" ON households FOR ALL USING (is_admin());

CREATE POLICY "hm_read" ON household_members FOR SELECT USING (user_id = auth.uid() OR is_verified_member());
CREATE POLICY "hm_insert" ON household_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "hm_admin" ON household_members FOR ALL USING (is_admin());

CREATE POLICY "alerts_read" ON alerts FOR SELECT USING (is_verified_member());
CREATE POLICY "alerts_create" ON alerts FOR INSERT WITH CHECK (is_verified_member() AND user_id = auth.uid());
CREATE POLICY "alerts_update_own" ON alerts FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "responses_read" ON alert_responses FOR SELECT USING (is_verified_member());
CREATE POLICY "responses_create" ON alert_responses FOR INSERT WITH CHECK (is_verified_member() AND responder_user_id = auth.uid());

CREATE POLICY "help_read" ON help_requests FOR SELECT USING (is_verified_member());
CREATE POLICY "help_create" ON help_requests FOR INSERT WITH CHECK (is_verified_member() AND user_id = auth.uid());
CREATE POLICY "help_update_own" ON help_requests FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "help_delete_own" ON help_requests FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "market_read" ON marketplace_items FOR SELECT USING (is_verified_member());
CREATE POLICY "market_create" ON marketplace_items FOR INSERT WITH CHECK (is_verified_member() AND user_id = auth.uid());
CREATE POLICY "market_update_own" ON marketplace_items FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "lf_read" ON lost_found FOR SELECT USING (is_verified_member());
CREATE POLICY "lf_create" ON lost_found FOR INSERT WITH CHECK (is_verified_member() AND user_id = auth.uid());
CREATE POLICY "lf_update_own" ON lost_found FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "news_read" ON news_items FOR SELECT USING (is_verified_member());
CREATE POLICY "news_admin" ON news_items FOR ALL USING (is_admin());

CREATE POLICY "skills_read_public" ON skills FOR SELECT USING (is_public = true AND is_verified_member());
CREATE POLICY "skills_read_own" ON skills FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "skills_manage_own" ON skills FOR ALL USING (user_id = auth.uid());

CREATE POLICY "notif_own" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif_update_own" ON notifications FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "push_own" ON push_subscriptions FOR ALL USING (user_id = auth.uid());

CREATE POLICY "violations_own" ON community_rules_violations FOR SELECT USING (reporter_user_id = auth.uid());
CREATE POLICY "violations_create" ON community_rules_violations FOR INSERT WITH CHECK (is_verified_member() AND reporter_user_id = auth.uid());
CREATE POLICY "violations_admin" ON community_rules_violations FOR ALL USING (is_admin());

CREATE POLICY "checkin_own" ON senior_checkins FOR ALL USING (user_id = auth.uid());
