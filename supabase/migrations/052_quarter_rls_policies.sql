-- ============================================================
-- Nachbar.io — Migration 052: Quarter-isolierte RLS Policies
-- Ersetzt bestehende Content-Policies durch quartiersbezogene.
-- Nutzt get_user_quarter_id(), is_super_admin(), is_quarter_admin_for()
-- aus Migration 051.
-- ============================================================


-- ============================================================
-- 1. ALERTS (hat user_id, household_id, quarter_id)
-- Bestehende Policies aus 001: alerts_read, alerts_create, alerts_update_own
-- ============================================================

DROP POLICY IF EXISTS "alerts_read" ON alerts;
DROP POLICY IF EXISTS "alerts_create" ON alerts;
DROP POLICY IF EXISTS "alerts_update_own" ON alerts;

-- SELECT: Eigenes Quartier, Super-Admin, Quarter-Admin
CREATE POLICY alerts_quarter_select ON alerts
    FOR SELECT USING (
        quarter_id = get_user_quarter_id()
        OR is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );

-- INSERT: Nur im eigenen Quartier
CREATE POLICY alerts_quarter_insert ON alerts
    FOR INSERT WITH CHECK (
        quarter_id = get_user_quarter_id()
        OR is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );

-- UPDATE: Eigene Eintraege im eigenen Quartier oder Admin
CREATE POLICY alerts_quarter_update ON alerts
    FOR UPDATE USING (
        (user_id = auth.uid() AND quarter_id = get_user_quarter_id())
        OR is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );

-- DELETE: Nur Admins
CREATE POLICY alerts_quarter_delete ON alerts
    FOR DELETE USING (
        is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );


-- ============================================================
-- 2. ALERT_RESPONSES (hat responder_user_id, kein eigenes quarter_id)
-- Quartiersfilter ueber parent alert.
-- Bestehende Policies aus 001: responses_read, responses_create
-- ============================================================

DROP POLICY IF EXISTS "responses_read" ON alert_responses;
DROP POLICY IF EXISTS "responses_create" ON alert_responses;

-- SELECT: Nur Responses zu Alerts im eigenen Quartier
CREATE POLICY alert_responses_quarter_select ON alert_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM alerts a
            WHERE a.id = alert_responses.alert_id
            AND (
                a.quarter_id = get_user_quarter_id()
                OR is_super_admin()
                OR is_quarter_admin_for(a.quarter_id)
            )
        )
    );

-- INSERT: Nur auf Alerts im eigenen Quartier antworten
CREATE POLICY alert_responses_quarter_insert ON alert_responses
    FOR INSERT WITH CHECK (
        responder_user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM alerts a
            WHERE a.id = alert_responses.alert_id
            AND (
                a.quarter_id = get_user_quarter_id()
                OR is_super_admin()
                OR is_quarter_admin_for(a.quarter_id)
            )
        )
    );

-- UPDATE: Eigene Responses oder Admin
CREATE POLICY alert_responses_quarter_update ON alert_responses
    FOR UPDATE USING (
        responder_user_id = auth.uid()
        OR is_super_admin()
        OR EXISTS (
            SELECT 1 FROM alerts a
            WHERE a.id = alert_responses.alert_id
            AND is_quarter_admin_for(a.quarter_id)
        )
    );

-- DELETE: Nur Admins
CREATE POLICY alert_responses_quarter_delete ON alert_responses
    FOR DELETE USING (
        is_super_admin()
        OR EXISTS (
            SELECT 1 FROM alerts a
            WHERE a.id = alert_responses.alert_id
            AND is_quarter_admin_for(a.quarter_id)
        )
    );


-- ============================================================
-- 3. HELP_REQUESTS (hat user_id, quarter_id)
-- Bestehende Policies aus 001: help_read, help_create, help_update_own, help_delete_own
-- ============================================================

DROP POLICY IF EXISTS "help_read" ON help_requests;
DROP POLICY IF EXISTS "help_create" ON help_requests;
DROP POLICY IF EXISTS "help_update_own" ON help_requests;
DROP POLICY IF EXISTS "help_delete_own" ON help_requests;

CREATE POLICY help_requests_quarter_select ON help_requests
    FOR SELECT USING (
        quarter_id = get_user_quarter_id()
        OR is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );

CREATE POLICY help_requests_quarter_insert ON help_requests
    FOR INSERT WITH CHECK (
        quarter_id = get_user_quarter_id()
        OR is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );

CREATE POLICY help_requests_quarter_update ON help_requests
    FOR UPDATE USING (
        (user_id = auth.uid() AND quarter_id = get_user_quarter_id())
        OR is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );

CREATE POLICY help_requests_quarter_delete ON help_requests
    FOR DELETE USING (
        (user_id = auth.uid() AND quarter_id = get_user_quarter_id())
        OR is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );


-- ============================================================
-- 4. MARKETPLACE_ITEMS (hat user_id, quarter_id)
-- Bestehende Policies aus 001: market_read, market_create, market_update_own
-- ============================================================

DROP POLICY IF EXISTS "market_read" ON marketplace_items;
DROP POLICY IF EXISTS "market_create" ON marketplace_items;
DROP POLICY IF EXISTS "market_update_own" ON marketplace_items;

CREATE POLICY marketplace_items_quarter_select ON marketplace_items
    FOR SELECT USING (
        quarter_id = get_user_quarter_id()
        OR is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );

CREATE POLICY marketplace_items_quarter_insert ON marketplace_items
    FOR INSERT WITH CHECK (
        quarter_id = get_user_quarter_id()
        OR is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );

CREATE POLICY marketplace_items_quarter_update ON marketplace_items
    FOR UPDATE USING (
        (user_id = auth.uid() AND quarter_id = get_user_quarter_id())
        OR is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );

CREATE POLICY marketplace_items_quarter_delete ON marketplace_items
    FOR DELETE USING (
        is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );


-- ============================================================
-- 5. LOST_FOUND (hat user_id, quarter_id)
-- Bestehende Policies aus 001: lf_read, lf_create, lf_update_own
-- ============================================================

DROP POLICY IF EXISTS "lf_read" ON lost_found;
DROP POLICY IF EXISTS "lf_create" ON lost_found;
DROP POLICY IF EXISTS "lf_update_own" ON lost_found;

CREATE POLICY lost_found_quarter_select ON lost_found
    FOR SELECT USING (
        quarter_id = get_user_quarter_id()
        OR is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );

CREATE POLICY lost_found_quarter_insert ON lost_found
    FOR INSERT WITH CHECK (
        quarter_id = get_user_quarter_id()
        OR is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );

CREATE POLICY lost_found_quarter_update ON lost_found
    FOR UPDATE USING (
        (user_id = auth.uid() AND quarter_id = get_user_quarter_id())
        OR is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );

CREATE POLICY lost_found_quarter_delete ON lost_found
    FOR DELETE USING (
        is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );


-- ============================================================
-- 6. EVENTS (hat user_id, quarter_id)
-- Bestehende Policies aus 004: events_read, events_create, events_update_own, events_delete_own
-- ============================================================

DROP POLICY IF EXISTS "events_read" ON events;
DROP POLICY IF EXISTS "events_create" ON events;
DROP POLICY IF EXISTS "events_update_own" ON events;
DROP POLICY IF EXISTS "events_delete_own" ON events;

CREATE POLICY events_quarter_select ON events
    FOR SELECT USING (
        quarter_id = get_user_quarter_id()
        OR is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );

CREATE POLICY events_quarter_insert ON events
    FOR INSERT WITH CHECK (
        quarter_id = get_user_quarter_id()
        OR is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );

CREATE POLICY events_quarter_update ON events
    FOR UPDATE USING (
        (user_id = auth.uid() AND quarter_id = get_user_quarter_id())
        OR is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );

CREATE POLICY events_quarter_delete ON events
    FOR DELETE USING (
        (user_id = auth.uid() AND quarter_id = get_user_quarter_id())
        OR is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );


-- ============================================================
-- 7. NEWS_ITEMS (kein user_id, quarter_id kann NULL sein fuer globale News)
-- Bestehende Policies aus 001: news_read, news_admin
-- ============================================================

DROP POLICY IF EXISTS "news_read" ON news_items;
DROP POLICY IF EXISTS "news_admin" ON news_items;

-- SELECT: Globale News (quarter_id IS NULL) oder eigenes Quartier
CREATE POLICY news_items_quarter_select ON news_items
    FOR SELECT USING (
        quarter_id IS NULL
        OR quarter_id = get_user_quarter_id()
        OR is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );

-- INSERT: Super-Admin oder Quarter-Admin
CREATE POLICY news_items_quarter_insert ON news_items
    FOR INSERT WITH CHECK (
        is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );

-- UPDATE: Super-Admin oder Quarter-Admin
CREATE POLICY news_items_quarter_update ON news_items
    FOR UPDATE USING (
        is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );

-- DELETE: Nur Super-Admin oder Quarter-Admin
CREATE POLICY news_items_quarter_delete ON news_items
    FOR DELETE USING (
        is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );


-- ============================================================
-- 8. CONVERSATIONS (hat participant_1, participant_2, quarter_id)
-- Bestehende Policies aus 004: conv_read, conv_create
-- ============================================================

DROP POLICY IF EXISTS "conv_read" ON conversations;
DROP POLICY IF EXISTS "conv_create" ON conversations;

-- SELECT: Nur eigene Gespraeche im eigenen Quartier
CREATE POLICY conversations_quarter_select ON conversations
    FOR SELECT USING (
        (participant_1 = auth.uid() OR participant_2 = auth.uid())
        AND (
            quarter_id = get_user_quarter_id()
            OR is_super_admin()
            OR is_quarter_admin_for(quarter_id)
        )
    );

-- INSERT: Nur im eigenen Quartier und als Teilnehmer
CREATE POLICY conversations_quarter_insert ON conversations
    FOR INSERT WITH CHECK (
        (participant_1 = auth.uid() OR participant_2 = auth.uid())
        AND (
            quarter_id = get_user_quarter_id()
            OR is_super_admin()
            OR is_quarter_admin_for(quarter_id)
        )
    );

-- UPDATE: Nur eigene Gespraeche (z.B. last_message_at aktualisieren)
CREATE POLICY conversations_quarter_update ON conversations
    FOR UPDATE USING (
        (participant_1 = auth.uid() OR participant_2 = auth.uid())
        AND (
            quarter_id = get_user_quarter_id()
            OR is_super_admin()
            OR is_quarter_admin_for(quarter_id)
        )
    );

-- DELETE: Nur Admins
CREATE POLICY conversations_quarter_delete ON conversations
    FOR DELETE USING (
        is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );


-- ============================================================
-- 9. SKILLS (hat user_id, quarter_id)
-- Bestehende Policies aus 001: skills_read_public, skills_read_own, skills_manage_own
-- ============================================================

DROP POLICY IF EXISTS "skills_read_public" ON skills;
DROP POLICY IF EXISTS "skills_read_own" ON skills;
DROP POLICY IF EXISTS "skills_manage_own" ON skills;

-- SELECT: Oeffentliche Skills im eigenen Quartier + eigene Skills
CREATE POLICY skills_quarter_select ON skills
    FOR SELECT USING (
        user_id = auth.uid()
        OR (
            is_public = true
            AND (
                quarter_id = get_user_quarter_id()
                OR is_super_admin()
                OR is_quarter_admin_for(quarter_id)
            )
        )
    );

-- INSERT: Nur im eigenen Quartier
CREATE POLICY skills_quarter_insert ON skills
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND (
            quarter_id = get_user_quarter_id()
            OR is_super_admin()
        )
    );

-- UPDATE: Nur eigene Skills
CREATE POLICY skills_quarter_update ON skills
    FOR UPDATE USING (
        user_id = auth.uid()
        OR is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );

-- DELETE: Eigene oder Admin
CREATE POLICY skills_quarter_delete ON skills
    FOR DELETE USING (
        user_id = auth.uid()
        OR is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );


-- ============================================================
-- 10. CARE_SOS_ALERTS (hat senior_id, quarter_id)
-- VORSICHT: Bestehende Care-RLS-Policies beibehalten!
-- Bestehende Policies aus 021:
--   care_sos_select_own, care_sos_select_helper, care_sos_select_admin,
--   care_sos_insert_own, care_sos_update_authorized
-- Strategie: Alte SELECT-Policies droppen und durch quartiersisolierte ersetzen.
-- INSERT und UPDATE bekommen zusaetzlich Quartiersfilter.
-- ============================================================

DROP POLICY IF EXISTS "care_sos_select_own" ON care_sos_alerts;
DROP POLICY IF EXISTS "care_sos_select_helper" ON care_sos_alerts;
DROP POLICY IF EXISTS "care_sos_select_admin" ON care_sos_alerts;
DROP POLICY IF EXISTS "care_sos_insert_own" ON care_sos_alerts;
DROP POLICY IF EXISTS "care_sos_update_authorized" ON care_sos_alerts;

-- SELECT: Eigene Alerts, Care-Helper im gleichen Quartier, oder Admin
CREATE POLICY care_sos_alerts_quarter_select ON care_sos_alerts
    FOR SELECT USING (
        senior_id = auth.uid()
        OR (is_care_helper_for(senior_id) AND quarter_id = get_user_quarter_id())
        OR is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );

-- INSERT: Nur fuer sich selbst im eigenen Quartier
CREATE POLICY care_sos_alerts_quarter_insert ON care_sos_alerts
    FOR INSERT WITH CHECK (
        senior_id = auth.uid()
        AND (
            quarter_id = get_user_quarter_id()
            OR is_super_admin()
        )
    );

-- UPDATE: Senior selbst, Care-Helper im Quartier, oder Admin
CREATE POLICY care_sos_alerts_quarter_update ON care_sos_alerts
    FOR UPDATE USING (
        senior_id = auth.uid()
        OR (is_care_helper_for(senior_id) AND quarter_id = get_user_quarter_id())
        OR is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );

-- DELETE: Nur Admins
CREATE POLICY care_sos_alerts_quarter_delete ON care_sos_alerts
    FOR DELETE USING (
        is_super_admin()
        OR is_quarter_admin_for(quarter_id)
    );


-- ============================================================
-- 11. NOTIFICATIONS (hat user_id, kein Quartiersfilter noetig)
-- Benachrichtigungen sind per-User, brauchen keinen Quartiersfilter.
-- Bestehende Policies aus 001: notif_own, notif_update_own
-- Bleiben unveraendert — nur SELECT und UPDATE fuer eigene Notifs.
-- ============================================================

-- Keine Aenderung an notifications — Policies bleiben user-scoped.


-- ============================================================
-- 12. QUARTERS (Leserecht fuer alle authentifizierten Nutzer)
-- Bestehende Policies aus 034: quarters_read, quarters_admin
-- ============================================================

DROP POLICY IF EXISTS "quarters_read" ON quarters;
DROP POLICY IF EXISTS "quarters_admin" ON quarters;

-- SELECT: Alle authentifizierten Nutzer sehen aktive Quartiere
CREATE POLICY quarters_select_active ON quarters
    FOR SELECT USING (
        auth.uid() IS NOT NULL
        AND (
            status = 'active'
            OR is_super_admin()
            OR is_quarter_admin_for(id)
        )
    );

-- INSERT/UPDATE/DELETE: Nur Super-Admin oder Quarter-Admin
CREATE POLICY quarters_admin_manage ON quarters
    FOR ALL USING (
        is_super_admin()
        OR is_quarter_admin_for(id)
    );


-- ============================================================
-- FERTIG — Alle Content-Tabellen nutzen jetzt Quartiersisolierung
-- ============================================================
