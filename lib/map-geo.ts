// Nachbar.io — Geo-Hilfsfunktionen fuer Leaflet-Karte

export interface GeoBuilding {
  osmId: number;
  houseNumber: string;
  street: string;
  centroid: { lat: number; lng: number };
  outline: [number, number][]; // [lat, lng] Paare
}

// Overpass-Query fuer Gebaeude in einer Bounding Box
export function buildOverpassQuery(
  swLat: number, swLng: number, neLat: number, neLng: number,
): string {
  const bbox = `${swLat},${swLng},${neLat},${neLng}`;
  return `[out:json][timeout:30];(way["building"](${bbox}););out body; >; out skel qt;`;
}

// Overpass-Antwort in GeoBuilding[] umwandeln
export function parseOverpassBuildings(data: {
  elements: Array<{
    type: string;
    id: number;
    lat?: number;
    lon?: number;
    tags?: Record<string, string>;
    nodes?: number[];
  }>;
}): GeoBuilding[] {
  // Node-Index aufbauen
  const nodes: Record<number, [number, number]> = {};
  for (const el of data.elements) {
    if (el.type === "node" && el.lat != null && el.lon != null) {
      nodes[el.id] = [el.lat, el.lon];
    }
  }

  const buildings: GeoBuilding[] = [];

  for (const el of data.elements) {
    if (el.type !== "way" || !el.tags?.building || !el.nodes?.length) continue;

    const outline: [number, number][] = [];
    for (const nid of el.nodes) {
      if (nodes[nid]) outline.push(nodes[nid]);
    }
    if (outline.length < 3) continue;

    // Mittelpunkt berechnen
    let latSum = 0, lngSum = 0;
    for (const [lat, lng] of outline) {
      latSum += lat;
      lngSum += lng;
    }
    const n = outline.length;

    buildings.push({
      osmId: el.id,
      houseNumber: el.tags["addr:housenumber"] ?? "",
      street: el.tags["addr:street"] ?? "",
      centroid: { lat: latSum / n, lng: lngSum / n },
      outline,
    });
  }

  return buildings;
}

// Overpass-API URL
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// Gebaeude fuer ein Quartier laden
export async function fetchBuildingsForArea(
  swLat: number, swLng: number, neLat: number, neLng: number,
): Promise<GeoBuilding[]> {
  const query = buildOverpassQuery(swLat, swLng, neLat, neLng);
  const resp = await fetch(`${OVERPASS_URL}?data=${encodeURIComponent(query)}`);
  if (!resp.ok) throw new Error(`Overpass API Fehler: ${resp.status}`);
  const data = await resp.json();
  return parseOverpassBuildings(data);
}
