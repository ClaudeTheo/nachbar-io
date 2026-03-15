-- 065_consultation_slots.sql
-- Online-Sprechstunde: Terminverwaltung + DSGVO-Einwilligung
-- Regulierung: Anlage 31b BMV-Ae, DSGVO Art. 9 Abs. 2a

-- === Sprechstunden-Termine ===
CREATE TABLE consultation_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter_id uuid REFERENCES quarters(id) NOT NULL,
  provider_type text NOT NULL CHECK (provider_type IN ('community', 'medical')),
  host_user_id uuid REFERENCES users(id),
  host_name text NOT NULL,
  title text NOT NULL DEFAULT 'Sprechstunde',
  scheduled_at timestamptz NOT NULL,
  duration_minutes int NOT NULL DEFAULT 15 CHECK (duration_minutes BETWEEN 5 AND 60),
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'waiting', 'active', 'completed', 'cancelled', 'no_show')),
  booked_by uuid REFERENCES users(id),
  booked_at timestamptz,
  room_id text,
  join_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_consultation_slots_quarter ON consultation_slots(quarter_id, scheduled_at);
CREATE INDEX idx_consultation_slots_booked ON consultation_slots(booked_by, status);
CREATE INDEX idx_consultation_slots_host ON consultation_slots(host_user_id, status);
ALTER TABLE consultation_slots ENABLE ROW LEVEL SECURITY;

-- Bewohner: eigene Termine + verfuegbare Slots im Quartier sehen
CREATE POLICY "consultation_select_resident" ON consultation_slots
  FOR SELECT USING (
    booked_by = auth.uid()
    OR host_user_id = auth.uid()
    OR (
      status = 'scheduled'
      AND booked_by IS NULL
      AND quarter_id IN (
        SELECT h.quarter_id FROM household_members hm
        JOIN households h ON h.id = hm.household_id
        WHERE hm.user_id = auth.uid()
      )
    )
  );

-- Bewohner: Slot buchen (nur wenn noch frei)
CREATE POLICY "consultation_book_resident" ON consultation_slots
  FOR UPDATE USING (
    booked_by IS NULL AND status = 'scheduled'
  ) WITH CHECK (
    booked_by = auth.uid()
  );

-- Host: eigene Slots verwalten
CREATE POLICY "consultation_host_all" ON consultation_slots
  FOR ALL USING (host_user_id = auth.uid());

-- Org-Admin Policy: wird mit Pro-Modul hinzugefuegt (benoetigt org_members Tabelle)
-- CREATE POLICY "consultation_org_admin" ON consultation_slots ...

-- === DSGVO-Einwilligung fuer Videosprechstunde ===
CREATE TABLE consultation_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  consent_version text NOT NULL DEFAULT 'v1',
  consented_at timestamptz NOT NULL DEFAULT now(),
  provider_type text NOT NULL CHECK (provider_type IN ('community', 'medical')),
  UNIQUE(user_id, consent_version, provider_type)
);

ALTER TABLE consultation_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consent_own" ON consultation_consents
  FOR ALL USING (user_id = auth.uid());
