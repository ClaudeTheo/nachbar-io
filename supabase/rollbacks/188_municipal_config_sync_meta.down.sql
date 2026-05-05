-- Rollback 188: Sync-Metadaten von municipal_config entfernen

ALTER TABLE public.municipal_config
  DROP COLUMN IF EXISTS sync_meta;
