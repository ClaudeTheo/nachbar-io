# BW-Hauskoordinaten Strategie fuer Karte und gruene Punkte

## Kontext

- Aktuell gibt es im Repo zwei relevante Kartenpfade:
  - [`app/(app)/profile/map-position/page.tsx`](C:/Users/thoma/Documents/New project/nachbar-io/app/(app)/profile/map-position/page.tsx) speichert eine manuell gesetzte Hausposition in `map_houses`.
  - [`components/LeafletMapInner.tsx`](C:/Users/thoma/Documents/New project/nachbar-io/components/LeafletMapInner.tsx) rendert die Quartier-Karte ueber `lat/lng` in Leaflet.
- Das aktuelle Problem ist nicht primaer Leaflet selbst, sondern die Genauigkeit der Punktlogik fuer Haus-/Bewohnerpositionen.

## Zielbild

- Fuer Baden-Wuerttemberg zuerst amtliche Hauskoordinaten verwenden.
- Hauspunkte und Gebaeudeumringe aus derselben amtlichen Datenbasis ableiten.
- Ungenaue Geocoder-Treffer nicht automatisch als gruene Hauspunkte speichern.
- Einmal bestaetigte Koordinaten dauerhaft speichern und nicht bei jedem App-Start neu geokodieren.

## Empfohlene Datenquellen

- Primaer fuer BW:
  - LGL BW Hauskoordinaten
  - LGL BW Hausumringe
  - bereitgestellte WMS/WFS/INSPIRE-Endpunkte aus der aktuellen Produktnotiz
- Fallback ausserhalb der amtlichen Treffer:
  - nur Geocoder mit expliziten Accuracy-/Precision-Signalen verwenden
  - automatische Uebernahme nur bei rooftop-/address-point-artigen Treffern

## Produktregeln

- Adresse bei Registrierung strukturiert erfassen:
  - `street_name`
  - `house_number`
  - `postal_code`
  - `city`
- Kein blindes Freitext-Geocoding als alleinige Quelle fuer Hauspunkte.
- BW-Treffer mit amtlicher Qualitaet `A` automatisch akzeptieren.
- Niedrige Genauigkeit nur mit Nutzerbestaetigung uebernehmen:
  - interpolated
  - street / road
  - range / house-number-range
  - approximate
- Den finalen Punkt mit Metadaten speichern:
  - `source`
  - `accuracy`
  - `verified`
  - `verified_at`
  - optional `raw_provider_payload`

## Technische Folgen fuer dieses Repo

- `map_houses` braucht mittelfristig zwei Ebenen:
  - amtliche bzw. geokodierte Basisposition (`lat/lng`)
  - optionale manuelle Korrektur / Override
- Die aktuelle SVG-Positionspflege in [`app/(app)/profile/map-position/page.tsx`](C:/Users/thoma/Documents/New project/nachbar-io/app/(app)/profile/map-position/page.tsx) ist fuer den Pilot als Fallback brauchbar, sollte aber nicht die primaere Quelle fuer reale Hausstandorte bleiben.
- Leaflet kann bleiben. Wichtiger ist:
  - saubere Transformation amtlicher Koordinaten nach WGS84 / EPSG:4326
  - klare Trennung zwischen exakten und ungenauen Treffern
  - persistierte, verifizierte Hauspunkte

## Konkreter Backend-Flow

1. Nutzer gibt strukturierte Adresse ein.
2. Backend prueft zuerst BW-Amtstreffer.
3. Bei amtlicher Hauskoordinate mit Qualitaet `A`:
   - `lat/lng` speichern
   - `source='lgl_bw_house_coordinate'`
   - `accuracy='building'`
   - `verified=true`
4. Bei keinem exakten Amtstreffer:
   - Fallback-Geocoder aufrufen
   - Accuracy-Signal auswerten
5. Bei ungenauem Treffer:
   - kurze Pin-Bestaetigung im UI
   - danach Punkt als manuell bestaetigt speichern
6. Leaflet rendert immer den gespeicherten, bereits entschiedenen Punkt und geokodiert nicht erneut.

## Konkreter Frontend-Flow

1. Registrierung / Profil trennt Strasse, Hausnummer, PLZ, Ort.
2. Wenn Treffer exakt ist:
   - direkt speichern
   - optional Gebaeudeumriss im Hintergrund fuer spaetere Visualisierung laden
3. Wenn Treffer ungenau ist:
   - Leaflet zeigt Punkt + Hausumgebung
   - Nutzer bestaetigt oder korrigiert
4. Danach wird nur noch der gespeicherte Punkt verwendet.

## Karten-/Rendering-Hinweise

- Leaflet rendert in EPSG:3857, die gespeicherten Punkte muessen korrekt aus EPSG:4326 kommen.
- Amtliche BW-Daten koennen als ETRS89/UTM vorliegen; diese Transformation muss serverseitig sauber passieren.
- Bei Custom-Markern weiter auf `iconAnchor` bzw. Marker-Zentrum achten, damit der gruene Punkt exakt auf der Koordinate sitzt.

## Offene Umsetzungsaufgaben

- Schema-Erweiterung fuer Positions-Metadaten planen.
- BW-Import-/Lookup-Service kapseln.
- Fallback-Geocoder nur mit Accuracy-Filter anbinden.
- `profile/map-position` von rein manueller SVG-Pflege auf "amtlich zuerst, manuell nur bei Bedarf" umstellen.
- Pruefen, ob Hausumringe als vorberechnete GeoJSON-/DB-Tabelle statt Live-WMS im Produkt besser passen.

## Quellen aus der aktuellen Produktnotiz

- Hauskoordinaten WMS:
  - `https://owsproxy.lgl-bw.de/owsproxy/ows/WMS_LGL-BW_ALKIS_Hauskoordinaten?REQUEST=GetCapabilities&SERVICE=WMS`
- Hauskoordinaten WFS:
  - `https://owsproxy.lgl-bw.de/owsproxy/wfs/WFS_INSP_BW_Adr_Hauskoord_ALKIS?SERVICE=WFS&REQUEST=GetCapabilities&VERSION=2.0.0`
- Hausumringe WMS:
  - `https://owsproxy.lgl-bw.de/owsproxy/ows/WMS_LGL-BW_ALKIS_Hausumringe?REQUEST=GetCapabilities&SERVICE=WMS`
