# Handoff - Map Activity Pins Preview mit Haus-Ankern

**Datum:** 2026-05-13  
**Von:** Codex  
**Status:** Lokal umgesetzt und verifiziert, noch nicht gepusht/deployed

## Kurzstand

Die Activity-Pins sind jetzt lokal auf der Leaflet/OpenStreetMap-Karte sichtbar:

- Preview-Route: `/map-activity-pins-preview`
- Nur lokal/Test sichtbar via `isLocalUiPreviewEnabled()`, in Production `notFound()`
- Zehn freigegebene Pin-Typen werden als echte Leaflet-`divIcon` Marker gerendert
- Die Preview nutzt anonymisierte Haus-Anker im Pilotgebiet statt frei verteilter Demo-Koordinaten
- Nach Founder-Feedback "Marker sind zu gross" wurde die Leaflet-Größe von `52x69` auf `28x37` reduziert
- Glow wird proportional zur SVG-Größe berechnet

## Relevante Dateien

```text
lib/map-activity-pins.ts
lib/map-activity-preview.ts
components/LeafletMapInner.tsx
components/LeafletKarte.tsx
components/NachbarKarte.tsx
components/map/ActivityPinIcon.tsx
app/map-activity-pins-preview/page.tsx
app/map-activity-pins-preview/ActivityPinsMapPreviewClient.tsx
__tests__/components/LeafletMapInner.activity-pins.test.tsx
__tests__/lib/map-activity-pins.test.ts
__tests__/lib/map-activity-preview.test.ts
__tests__/app/map-activity-pins-preview.test.tsx
```

## Koordinaten/API-Entscheidung

Die vorhandene Codebasis hat bereits die richtige Richtung:

- `lib/geocoding/lgl-bw.ts` spricht den LGL-BW-WFS fuer amtliche Hauskoordinaten an.
- `app/api/household/position/resolve-bw/route.ts` aktualisiert verifizierte Haushaltskoordinaten serverseitig.
- `lib/map-houses.ts` laedt fuer Leaflet nur `households` mit `position_verified = true`, sofern die Metadaten-Spalte existiert.
- `map_houses.geo` und `households.map_house_id` sind bereits vorhanden.

Produktregel fuer echte Activity-Pins:

1. Der Client darf nicht selbst Adressen geocoden.
2. Activity-Pins referenzieren spaeter serverseitig gepruefte Ziele, ideal `map_house_id` oder einen freigegebenen Treffpunkt.
3. Die API liefert nur Pins, die der Nutzer sehen darf.
4. Jugend/sensible Hilfe bekommt bei Bedarf ungefaehre Koordinaten, nicht die exakte Privatadresse.
5. Keine OpenStreetMap-Daten schreiben; OSM bleibt Grundkarte, QuartierApp ist eigener Layer.

## Externe Referenzen

- LGL-BW-WFS im Code: `https://owsproxy.lgl-bw.de/owsproxy/wfs/WFS_INSP_BW_Adr_Hauskoord_ALKIS`
- Nominatim Search API: `https://nominatim.org/release-docs/latest/api/Search/`
- Nominatim Usage Policy: `https://operations.osmfoundation.org/policies/nominatim/`
- Overpass Bounding-Box-Doku: `https://dev.overpass-api.de/overpass-doc/en/full_data/bbox.html`

Hinweis: Nominatim ist fuer Einzelsuche/Adresssuche geeignet, aber nicht als Live-Bulk-Geocoder im Client. Fuer unser Quartier ist besser: serverseitig/offline aufloesen, speichern, verifizieren, danach Activity-Pins auf diese gespeicherten Koordinaten legen.

## Verifikation

Zuletzt gruen:

```text
npx vitest run __tests__/components/LeafletMapInner.activity-pins.test.tsx __tests__/lib/map-activity-pins.test.ts __tests__/lib/map-activity-preview.test.ts __tests__/app/map-activity-pins-preview.test.tsx __tests__/lib/closed-pilot.test.ts __tests__/middleware/closed-pilot.test.ts
# 6 files, 71 tests passed

npx eslint components/LeafletMapInner.tsx lib/map-activity-pins.ts lib/map-activity-preview.ts app/map-activity-pins-preview/ActivityPinsMapPreviewClient.tsx __tests__/components/LeafletMapInner.activity-pins.test.tsx __tests__/lib/map-activity-pins.test.ts __tests__/lib/map-activity-preview.test.ts __tests__/app/map-activity-pins-preview.test.tsx

npx tsc --noEmit

git diff --check
# nur CRLF-Warnungen
```

Browser-Check:

- URL: `http://localhost:3005/map-activity-pins-preview`
- 10 Leaflet Marker sichtbar
- SVG-Marker im Browser: `width="28" height="37"`
- Keine Browser-Errors, nur normale Dev-Logs

## Rote Zone

Keine Prod-DB-Schreibaktion, kein Migration-Apply, kein Push, kein Deploy, keine Vercel-Env/Secrets/Billing/Provider-Live-Aktion in diesem Schritt.
