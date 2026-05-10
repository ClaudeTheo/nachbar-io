-- Migration 190: municipal_config.crawled_events fuer Welle W10
--
-- Ergaenzt municipal_config um zwei Spalten fuer den Event-Feed-Crawler:
-- - crawled_events JSONB: Liste der gecrawlten Events (RSS/iCal)
-- - crawled_events_synced_at TIMESTAMPTZ: Zeitpunkt des letzten Imports
--
-- Trennung zur bestehenden 'events'-Spalte (Mig 130, regelmaessige Events
-- wie Wochenmarkt) bewusst — Crawled-Events sind dynamisch + zeitkritisch,
-- statische Events sind manuell gepflegt.
--
-- Apply: Founder-Hand (Pilot-Reset-Phase) — file-first, kein automatischer
-- mcp__apply_migration in dieser Welle.

ALTER TABLE municipal_config
  ADD COLUMN IF NOT EXISTS crawled_events JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS crawled_events_synced_at TIMESTAMPTZ;

COMMENT ON COLUMN municipal_config.crawled_events IS
  'Externe Events aus RSS/iCal-Feeds (Welle W10): [{source, feedUrl, uid, title, description, location, startDate, endDate, link, isAllDay}]. Wird durch /api/admin/quarters/[id]/events/apply ueberschrieben.';

COMMENT ON COLUMN municipal_config.crawled_events_synced_at IS
  'Zeitpunkt des letzten erfolgreichen Crawl-Imports — Frontend kann anzeigen "Aktualisiert vor X Min".';
