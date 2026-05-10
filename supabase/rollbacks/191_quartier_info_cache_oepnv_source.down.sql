-- Rollback 191: quartier_info_cache OEPNV-Cache-Source entfernen
--
-- Vor dem Ruecksetzen muessen OEPNV-Cache-Zeilen entfernt werden, weil die
-- alte Constraint sie nicht erlaubt.

DELETE FROM public.quartier_info_cache
WHERE source = 'oepnv';

ALTER TABLE public.quartier_info_cache
  DROP CONSTRAINT IF EXISTS quartier_info_cache_source_check;

ALTER TABLE public.quartier_info_cache
  ADD CONSTRAINT quartier_info_cache_source_check
  CHECK (source IN ('weather', 'pollen', 'nina'));
