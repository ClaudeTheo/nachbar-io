-- ============================================================
-- Nachbar.io — Migration 051: Multi-Quartier-Grundlagen
-- Transformiert die App von Single-Quartier zu Multi-Quartier.
-- Idempotent: kann mehrfach ausgefuehrt werden.
-- ============================================================

-- ============================================================
-- 1. ROLLEN-SPALTE IN USERS
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('super_admin', 'quarter_admin', 'user'));

-- Bestehende Admins zu Super-Admins befoerdern
UPDATE users SET role = 'super_admin' WHERE is_admin = true AND role = 'user';


-- ============================================================
-- 2. QUARTERS-TABELLE ERWEITERN
-- ============================================================

ALTER TABLE quarters ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'DE';
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS map_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS max_households INTEGER DEFAULT 100;
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'archived'));
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS invite_prefix TEXT;
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Unique-Constraint fuer invite_prefix (nur wenn noch nicht vorhanden)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'quarters_invite_prefix_key'
    ) THEN
        ALTER TABLE quarters ADD CONSTRAINT quarters_invite_prefix_key UNIQUE (invite_prefix);
    END IF;
END $$;

-- Pilotquartier aktualisieren
UPDATE quarters SET
    city = 'Bad Saeckingen',
    state = 'Baden-Wuerttemberg',
    country = 'DE',
    invite_prefix = 'PILOT',
    status = 'active',
    map_config = jsonb_build_object(
        'type', 'svg',
        'viewBox', '0 0 1083 766',
        'backgroundImage', '/map-quartier.jpg'
    )
WHERE slug = 'bad-saeckingen-pilot';


-- ============================================================
-- 3. HOUSEHOLDS: CHECK-CONSTRAINT ENTFERNEN, QUARTER_ID NOT NULL
-- ============================================================

-- Strassen-Check-Constraint entfernen (erlaubt beliebige Strassennamen)
ALTER TABLE households DROP CONSTRAINT IF EXISTS households_street_name_check;

-- Sicherstellen, dass alle Haushalte ein Quartier haben
UPDATE households SET quarter_id = (
    SELECT id FROM quarters WHERE slug = 'bad-saeckingen-pilot'
) WHERE quarter_id IS NULL;

-- quarter_id NOT NULL setzen
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'households' AND column_name = 'quarter_id'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE households ALTER COLUMN quarter_id SET NOT NULL;
    END IF;
END $$;

-- Alten Unique-Constraint entfernen falls vorhanden, neuen erstellen
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'households_street_name_house_number_key'
        AND conrelid = 'households'::regclass
    ) THEN
        ALTER TABLE households DROP CONSTRAINT households_street_name_house_number_key;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'households_quarter_street_house_key'
    ) THEN
        ALTER TABLE households ADD CONSTRAINT households_quarter_street_house_key
            UNIQUE (quarter_id, street_name, house_number);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_households_quarter_id ON households(quarter_id);


-- ============================================================
-- 4. QUARTER_ID ZU ALLEN CONTENT-TABELLEN HINZUFUEGEN
-- ============================================================
-- Hinweis: users hat KEIN household_id direkt. Die Verknuepfung
-- laeuft ueber household_members(user_id) -> households(quarter_id).

-- ---- alerts (hat eigenes household_id) ----
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES quarters(id);
UPDATE alerts SET quarter_id = (
    SELECT h.quarter_id FROM households h
    WHERE h.id = alerts.household_id
) WHERE quarter_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_quarter_id ON alerts(quarter_id);

-- ---- help_requests ----
ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES quarters(id);
UPDATE help_requests SET quarter_id = (
    SELECT h.quarter_id FROM household_members hm
    JOIN households h ON h.id = hm.household_id
    WHERE hm.user_id = help_requests.user_id
    LIMIT 1
) WHERE quarter_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_help_requests_quarter_id ON help_requests(quarter_id);

-- ---- marketplace_items ----
ALTER TABLE marketplace_items ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES quarters(id);
UPDATE marketplace_items SET quarter_id = (
    SELECT h.quarter_id FROM household_members hm
    JOIN households h ON h.id = hm.household_id
    WHERE hm.user_id = marketplace_items.user_id
    LIMIT 1
) WHERE quarter_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_marketplace_items_quarter_id ON marketplace_items(quarter_id);

-- ---- lost_found ----
ALTER TABLE lost_found ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES quarters(id);
UPDATE lost_found SET quarter_id = (
    SELECT h.quarter_id FROM household_members hm
    JOIN households h ON h.id = hm.household_id
    WHERE hm.user_id = lost_found.user_id
    LIMIT 1
) WHERE quarter_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_lost_found_quarter_id ON lost_found(quarter_id);

-- ---- events ----
ALTER TABLE events ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES quarters(id);
UPDATE events SET quarter_id = (
    SELECT h.quarter_id FROM household_members hm
    JOIN households h ON h.id = hm.household_id
    WHERE hm.user_id = events.user_id
    LIMIT 1
) WHERE quarter_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_quarter_id ON events(quarter_id);

-- ---- news_items (kein User-FK — wird direkt auf Pilot gesetzt) ----
ALTER TABLE news_items ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES quarters(id);
UPDATE news_items SET quarter_id = (
    SELECT id FROM quarters WHERE slug = 'bad-saeckingen-pilot'
) WHERE quarter_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_news_items_quarter_id ON news_items(quarter_id);

-- ---- conversations (nutzt participant_1 als Bezug) ----
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES quarters(id);
UPDATE conversations SET quarter_id = (
    SELECT h.quarter_id FROM household_members hm
    JOIN households h ON h.id = hm.household_id
    WHERE hm.user_id = conversations.participant_1
    LIMIT 1
) WHERE quarter_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_quarter_id ON conversations(quarter_id);

-- ---- skills ----
ALTER TABLE skills ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES quarters(id);
UPDATE skills SET quarter_id = (
    SELECT h.quarter_id FROM household_members hm
    JOIN households h ON h.id = hm.household_id
    WHERE hm.user_id = skills.user_id
    LIMIT 1
) WHERE quarter_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_skills_quarter_id ON skills(quarter_id);

-- ---- care_sos_alerts ----
ALTER TABLE care_sos_alerts ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES quarters(id);
UPDATE care_sos_alerts SET quarter_id = (
    SELECT h.quarter_id FROM household_members hm
    JOIN households h ON h.id = hm.household_id
    WHERE hm.user_id = care_sos_alerts.senior_id
    LIMIT 1
) WHERE quarter_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_care_sos_alerts_quarter_id ON care_sos_alerts(quarter_id);

-- ---- polls (existiert, Migration 012) ----
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'polls') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'polls' AND column_name = 'quarter_id'
        ) THEN
            ALTER TABLE polls ADD COLUMN quarter_id UUID REFERENCES quarters(id);
            UPDATE polls SET quarter_id = (
                SELECT h.quarter_id FROM household_members hm
                JOIN households h ON h.id = hm.household_id
                WHERE hm.user_id = polls.user_id
                LIMIT 1
            ) WHERE quarter_id IS NULL;
        END IF;
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_polls_quarter_id ON polls(quarter_id)';
    END IF;
END $$;

-- ---- leihboerse_items (existiert, Migration 011) ----
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leihboerse_items') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'leihboerse_items' AND column_name = 'quarter_id'
        ) THEN
            ALTER TABLE leihboerse_items ADD COLUMN quarter_id UUID REFERENCES quarters(id);
            UPDATE leihboerse_items SET quarter_id = (
                SELECT h.quarter_id FROM household_members hm
                JOIN households h ON h.id = hm.household_id
                WHERE hm.user_id = leihboerse_items.user_id
                LIMIT 1
            ) WHERE quarter_id IS NULL;
        END IF;
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_leihboerse_items_quarter_id ON leihboerse_items(quarter_id)';
    END IF;
END $$;

-- ---- paketannahme (existiert, Migration 013) ----
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'paketannahme') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'paketannahme' AND column_name = 'quarter_id'
        ) THEN
            ALTER TABLE paketannahme ADD COLUMN quarter_id UUID REFERENCES quarters(id);
            UPDATE paketannahme SET quarter_id = (
                SELECT h.quarter_id FROM household_members hm
                JOIN households h ON h.id = hm.household_id
                WHERE hm.user_id = paketannahme.user_id
                LIMIT 1
            ) WHERE quarter_id IS NULL;
        END IF;
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_paketannahme_quarter_id ON paketannahme(quarter_id)';
    END IF;
END $$;

-- ---- vacation_modes (existiert, Migration 009) ----
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vacation_modes') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'vacation_modes' AND column_name = 'quarter_id'
        ) THEN
            ALTER TABLE vacation_modes ADD COLUMN quarter_id UUID REFERENCES quarters(id);
            UPDATE vacation_modes SET quarter_id = (
                SELECT h.quarter_id FROM household_members hm
                JOIN households h ON h.id = hm.household_id
                WHERE hm.user_id = vacation_modes.user_id
                LIMIT 1
            ) WHERE quarter_id IS NULL;
        END IF;
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_vacation_modes_quarter_id ON vacation_modes(quarter_id)';
    END IF;
END $$;

-- ---- noise_warnings (existiert nicht in Migrationen — vorsorglich) ----
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'noise_warnings') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'noise_warnings' AND column_name = 'quarter_id'
        ) THEN
            ALTER TABLE noise_warnings ADD COLUMN quarter_id UUID REFERENCES quarters(id);
            UPDATE noise_warnings SET quarter_id = (
                SELECT h.quarter_id FROM household_members hm
                JOIN households h ON h.id = hm.household_id
                WHERE hm.user_id = noise_warnings.user_id
                LIMIT 1
            ) WHERE quarter_id IS NULL;
        END IF;
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_noise_warnings_quarter_id ON noise_warnings(quarter_id)';
    END IF;
END $$;

-- ---- invite_codes (existiert nicht in Migrationen — vorsorglich) ----
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invite_codes') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'invite_codes' AND column_name = 'quarter_id'
        ) THEN
            ALTER TABLE invite_codes ADD COLUMN quarter_id UUID REFERENCES quarters(id);
        END IF;
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_invite_codes_quarter_id ON invite_codes(quarter_id)';
    END IF;
END $$;

-- Fallback: Zeilen ohne quarter_id bekommen das Pilotquartier
-- (fuer Eintraege deren Nutzer keinem Haushalt zugeordnet sind)
DO $$
DECLARE
    pilot_id UUID;
BEGIN
    SELECT id INTO pilot_id FROM quarters WHERE slug = 'bad-saeckingen-pilot';
    IF pilot_id IS NOT NULL THEN
        UPDATE alerts SET quarter_id = pilot_id WHERE quarter_id IS NULL;
        UPDATE help_requests SET quarter_id = pilot_id WHERE quarter_id IS NULL;
        UPDATE marketplace_items SET quarter_id = pilot_id WHERE quarter_id IS NULL;
        UPDATE lost_found SET quarter_id = pilot_id WHERE quarter_id IS NULL;
        UPDATE events SET quarter_id = pilot_id WHERE quarter_id IS NULL;
        UPDATE news_items SET quarter_id = pilot_id WHERE quarter_id IS NULL;
        UPDATE conversations SET quarter_id = pilot_id WHERE quarter_id IS NULL;
        UPDATE skills SET quarter_id = pilot_id WHERE quarter_id IS NULL;
        UPDATE care_sos_alerts SET quarter_id = pilot_id WHERE quarter_id IS NULL;
        -- Bedingte Tabellen (noise_warnings etc.)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'noise_warnings') THEN
            UPDATE noise_warnings SET quarter_id = pilot_id WHERE quarter_id IS NULL;
        END IF;
    END IF;
END $$;


-- ============================================================
-- 5. QUARTER_ADMINS TABELLE
-- ============================================================

CREATE TABLE IF NOT EXISTS quarter_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quarter_id UUID NOT NULL REFERENCES quarters(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by UUID REFERENCES users(id),
    CONSTRAINT quarter_admins_unique UNIQUE (quarter_id, user_id)
);

ALTER TABLE quarter_admins ENABLE ROW LEVEL SECURITY;

-- Prueft ob der aktuelle Nutzer Super-Admin ist
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Super-Admins duerfen alles
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'quarter_admins_super_admin'
    ) THEN
        CREATE POLICY quarter_admins_super_admin ON quarter_admins
            FOR ALL USING (is_super_admin());
    END IF;
END $$;

-- Quarter-Admins duerfen ihre eigene Zuordnung lesen
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'quarter_admins_read_own'
    ) THEN
        CREATE POLICY quarter_admins_read_own ON quarter_admins
            FOR SELECT USING (user_id = auth.uid());
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_quarter_admins_quarter ON quarter_admins(quarter_id);
CREATE INDEX IF NOT EXISTS idx_quarter_admins_user ON quarter_admins(user_id);


-- ============================================================
-- 6. RLS-HILFSFUNKTIONEN
-- ============================================================

-- Quartier-ID des aktuellen Nutzers abrufen (ueber household_members)
CREATE OR REPLACE FUNCTION get_user_quarter_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT h.quarter_id FROM household_members hm
        JOIN households h ON h.id = hm.household_id
        WHERE hm.user_id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Prueft ob der aktuelle Nutzer Quarter-Admin fuer ein bestimmtes Quartier ist
CREATE OR REPLACE FUNCTION is_quarter_admin_for(p_quarter_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM quarter_admins
        WHERE user_id = auth.uid()
        AND quarter_id = p_quarter_id
    ) OR is_super_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Bestehende is_admin()-Funktion aktualisieren:
-- Jetzt true wenn is_admin=true ODER role='super_admin'
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND (is_admin = true OR role = 'super_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ============================================================
-- FERTIG
-- ============================================================
