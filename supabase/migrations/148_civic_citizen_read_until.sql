-- Migration 148: Buerger-Read-Tracking
-- citizen_read_until: Zeitpunkt, an dem der Buerger den Thread zuletzt geoeffnet hat
-- Nur auf Root-Nachrichten relevant (thread_id = id)
-- NULL = Thread wurde nie geoeffnet

ALTER TABLE civic_messages
  ADD COLUMN citizen_read_until TIMESTAMPTZ;
