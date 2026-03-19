-- Migration 089: Wiederkehrende Events
-- Felder fuer Wiederholungsregeln und Verknuepfung von Instanzen

-- Wiederholungsregel (einfach, kein RRULE-Overkill)
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_rule TEXT
  CHECK (recurrence_rule IS NULL OR recurrence_rule IN (
    'weekly', 'biweekly', 'monthly', 'first_monday', 'last_friday'
  ));

-- Referenz auf Parent-Event (fuer automatisch erstellte Instanzen)
ALTER TABLE events ADD COLUMN IF NOT EXISTS parent_event_id UUID
  REFERENCES events(id) ON DELETE SET NULL;

-- Bis wann wiederholen (optional, NULL = unbegrenzt bis manuell gestoppt)
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;

-- Index fuer Parent-Lookup
CREATE INDEX IF NOT EXISTS idx_events_parent ON events(parent_event_id)
  WHERE parent_event_id IS NOT NULL;

-- Index fuer Wiederholungs-Cron (findet Events mit aktiver Wiederholung)
CREATE INDEX IF NOT EXISTS idx_events_recurrence ON events(recurrence_rule)
  WHERE recurrence_rule IS NOT NULL;
