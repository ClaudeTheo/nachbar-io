-- Migration 188: Sync-Metadaten fuer dynamische municipal_config-Daten

ALTER TABLE public.municipal_config
  ADD COLUMN IF NOT EXISTS sync_meta JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.municipal_config.sync_meta IS
  'Sync-Metadaten je dynamischer Quelle, z.B. apotheken.status/source/last_synced_at/counts/error';
