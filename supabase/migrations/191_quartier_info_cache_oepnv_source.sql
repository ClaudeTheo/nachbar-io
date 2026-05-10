-- Migration 191: quartier_info_cache erlaubt OEPNV-Cache
--
-- Der Quartier-Info-Sync schreibt seit Welle 2 dynamische OEPNV-Abfahrten
-- in quartier_info_cache mit source='oepnv'. Die Ursprungstabelle aus Mig 118
-- erlaubte aber nur weather/pollen/nina. Dadurch konnte der Sync OEPNV nicht
-- persistieren. File-first; Prod-Apply bleibt Founder-Hand.

ALTER TABLE public.quartier_info_cache
  DROP CONSTRAINT IF EXISTS quartier_info_cache_source_check;

ALTER TABLE public.quartier_info_cache
  ADD CONSTRAINT quartier_info_cache_source_check
  CHECK (source IN ('weather', 'pollen', 'nina', 'oepnv'));
