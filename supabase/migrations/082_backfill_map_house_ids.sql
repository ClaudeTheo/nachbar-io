-- Migration 082: Bestehende Bad Saeckingen households mit map_house_id verknuepfen
-- Matching ueber street_name/house_number + quarter_id
-- 3 Households bleiben unverknuepft (Hausnr 15/PS, 1/OR, 3/OR haben keinen map_house Marker)

UPDATE households h
SET map_house_id = mh.id
FROM map_houses mh
WHERE h.quarter_id = mh.quarter_id
  AND h.map_house_id IS NULL
  AND h.house_number = mh.house_number
  AND (
    (h.street_name IN ('Purkersdorfer Straße', 'Purkersdorfer Str.') AND mh.street_code = 'PS')
    OR (h.street_name = 'Sanarystraße' AND mh.street_code = 'SN')
    OR (h.street_name = 'Oberer Rebberg' AND mh.street_code = 'OR')
  );
