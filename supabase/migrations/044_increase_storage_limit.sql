-- Migration 044: Storage Bucket Limit erhoehen
-- Screenshots (besonders von iPhones) sind nach Kompression oft >2 MB
-- Limit von 2 MB auf 10 MB erhoehen fuer Test-Screenshots
-- Client-seitige Validierung begrenzt regulaere Uploads weiterhin auf 2 MB

UPDATE storage.buckets
SET file_size_limit = 10485760  -- 10 MB
WHERE id = 'images';
