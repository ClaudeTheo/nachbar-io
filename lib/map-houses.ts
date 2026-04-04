// Nachbar.io — Karten-Konfiguration (gemeinsam fuer NachbarKarte + MapEditor)

import { createClient } from "@/lib/supabase/client";
import type { MapConfig } from "@/lib/quarters/types";

// Standard-Kartengroesse (Pilot-Quartier), ueberschreibbar per map_config.viewBox
export const MAP_W = 1083;
export const MAP_H = 766;

export type LampColor = "green" | "red" | "yellow" | "blue" | "orange";
export type StreetCode = string; // Dynamisch — Strassenname aus household oder Legacy-Code

export interface MapHouseData {
  id: string;
  num: string;
  s: StreetCode;
  x: number;
  y: number;
  defaultColor: LampColor;
}

// Erweiterte Haus-Daten mit Geo-Koordinaten (fuer Leaflet)
export interface GeoMapHouseData extends MapHouseData {
  lat: number;
  lng: number;
  quarterId?: string;
}

export const STREET_LABELS: Record<string, string> = {
  PS: "Purkersdorfer Str.",
  SN: "Sanarystraße",
  OR: "Oberer Rebberg",
  // Laufenburg
  HS: "Hauptstraße",
  MG: "Marktgasse",
  CS: "Codmanstraße",
  // Rheinfelden
  FS: "Friedrichstraße",
  KF: "Karl-Fürstenberg-Str.",
  TS: "Tutti-Straße",
  // Koeln
  AM: "Alter Markt",
  HM: "Heumarkt",
  SG: "Salzgasse",
  AB: "Am Bollwerk",
};

// Mapping street_code → voller Strassenname (Legacy: nur fuer SVG-Karte)
// Leaflet-Karten nutzen map_house_id statt Street-Code-Lookup (skalierbar)
export const STREET_CODE_TO_NAME: Record<StreetCode, string> = {
  PS: "Purkersdorfer Straße",
  SN: "Sanarystraße",
  OR: "Oberer Rebberg",
  // Laufenburg
  HS: "Hauptstraße",
  MG: "Marktgasse",
  CS: "Codmanstraße",
  // Rheinfelden
  FS: "Friedrichstraße",
  KF: "Karl-Fürstenberg-Straße",
  TS: "Tutti-Straße",
  // Koeln
  AM: "Alter Markt",
  HM: "Heumarkt",
  SG: "Salzgasse",
  AB: "Am Bollwerk",
};

export const COLOR_CYCLE: LampColor[] = ["green", "red", "yellow"];

export const COLOR_CFG: Record<
  LampColor,
  { fill: string; ring: string; glow: string; label: string }
> = {
  green: {
    fill: "#22c55e",
    ring: "#15803d",
    glow: "rgba(34,197,94,0.4)",
    label: "Grün",
  },
  red: {
    fill: "#ef4444",
    ring: "#b91c1c",
    glow: "rgba(239,68,68,0.4)",
    label: "Rot",
  },
  yellow: {
    fill: "#eab308",
    ring: "#a16207",
    glow: "rgba(234,179,8,0.4)",
    label: "Gelb",
  },
  blue: {
    fill: "#3b82f6",
    ring: "#1d4ed8",
    glow: "rgba(59,130,246,0.4)",
    label: "Urlaub",
  },
  orange: {
    fill: "#f97316",
    ring: "#c2410c",
    glow: "rgba(249,115,22,0.4)",
    label: "Paket",
  },
};

// Statische Haus-Daten (Fallback wenn Supabase leer oder nicht erreichbar)
export const DEFAULT_HOUSES: MapHouseData[] = [
  // Purkersdorfer Str. — Nordseite (ungerade, oben)
  { id: "ps11", num: "11", s: "PS", x: 67, y: 251, defaultColor: "green" },
  { id: "ps17", num: "17", s: "PS", x: 212, y: 231, defaultColor: "green" },
  { id: "ps19", num: "19", s: "PS", x: 241, y: 224, defaultColor: "green" },
  { id: "ps23", num: "23", s: "PS", x: 332, y: 213, defaultColor: "green" },
  { id: "ps29", num: "29", s: "PS", x: 463, y: 235, defaultColor: "green" },
  { id: "ps31", num: "31", s: "PS", x: 489, y: 230, defaultColor: "green" },
  { id: "ps33", num: "33", s: "PS", x: 518, y: 223, defaultColor: "green" },
  { id: "ps37", num: "37", s: "PS", x: 588, y: 212, defaultColor: "green" },
  { id: "ps39", num: "39", s: "PS", x: 627, y: 226, defaultColor: "green" },
  { id: "ps41", num: "41", s: "PS", x: 687, y: 226, defaultColor: "green" },
  { id: "ps45", num: "45", s: "PS", x: 649, y: 124, defaultColor: "green" },
  { id: "ps47", num: "47", s: "PS", x: 727, y: 226, defaultColor: "green" },
  { id: "ps55", num: "55", s: "PS", x: 887, y: 116, defaultColor: "green" },
  { id: "ps59", num: "59", s: "PS", x: 876, y: 159, defaultColor: "green" },
  { id: "ps22", num: "22", s: "PS", x: 919, y: 219, defaultColor: "green" },
  { id: "ps24", num: "24", s: "PS", x: 970, y: 206, defaultColor: "green" },
  { id: "ps32", num: "32", s: "PS", x: 1028, y: 97, defaultColor: "green" },
  { id: "ps34", num: "34", s: "PS", x: 1046, y: 54, defaultColor: "green" },
  // Purkersdorfer Str. — Suedseite (gerade/niedrig, unten)
  { id: "ps20", num: "20", s: "PS", x: 960, y: 324, defaultColor: "green" },
  { id: "ps9", num: "9", s: "PS", x: 84, y: 334, defaultColor: "green" },
  { id: "ps7", num: "7", s: "PS", x: 117, y: 341, defaultColor: "green" },
  { id: "ps5", num: "5", s: "PS", x: 143, y: 330, defaultColor: "green" },
  { id: "ps3", num: "3", s: "PS", x: 210, y: 341, defaultColor: "green" },
  { id: "ps1", num: "1", s: "PS", x: 173, y: 369, defaultColor: "green" },
  { id: "ps2", num: "2", s: "PS", x: 194, y: 285, defaultColor: "green" },
  { id: "ps4", num: "4", s: "PS", x: 261, y: 338, defaultColor: "green" },
  { id: "ps8", num: "8", s: "PS", x: 434, y: 337, defaultColor: "green" },
  { id: "ps10", num: "10", s: "PS", x: 478, y: 337, defaultColor: "green" },
  { id: "ps4b", num: "4b", s: "PS", x: 358, y: 299, defaultColor: "green" },
  { id: "ps6", num: "6", s: "PS", x: 431, y: 306, defaultColor: "green" },
  { id: "ps12", num: "12", s: "PS", x: 676, y: 305, defaultColor: "green" },
  { id: "ps14", num: "14", s: "PS", x: 545, y: 280, defaultColor: "green" },
  // Purkersdorfer Str. — ergaenzte Haeuser (interpolierte Positionen)
  { id: "ps13", num: "13", s: "PS", x: 140, y: 241, defaultColor: "green" },
  { id: "ps18", num: "18", s: "PS", x: 790, y: 300, defaultColor: "green" },
  { id: "ps21", num: "21", s: "PS", x: 288, y: 218, defaultColor: "green" },
  { id: "ps25", num: "25", s: "PS", x: 380, y: 224, defaultColor: "green" },
  { id: "ps27", num: "27", s: "PS", x: 425, y: 230, defaultColor: "green" },
  { id: "ps35", num: "35", s: "PS", x: 550, y: 218, defaultColor: "green" },
  { id: "ps43", num: "43", s: "PS", x: 720, y: 130, defaultColor: "green" },
  { id: "ps49", num: "49", s: "PS", x: 800, y: 140, defaultColor: "green" },
  { id: "ps51", num: "51", s: "PS", x: 840, y: 130, defaultColor: "green" },
  // Sanarystraße
  { id: "sn21", num: "21", s: "SN", x: 851, y: 378, defaultColor: "green" },
  { id: "sn21b", num: "21b", s: "SN", x: 909, y: 353, defaultColor: "green" },
  { id: "sn23", num: "23", s: "SN", x: 982, y: 373, defaultColor: "green" },
  { id: "sn24", num: "24", s: "SN", x: 991, y: 305, defaultColor: "green" },
  { id: "sn27", num: "27", s: "SN", x: 1022, y: 520, defaultColor: "green" },
  { id: "sn1", num: "1", s: "SN", x: 318, y: 394, defaultColor: "green" },
  { id: "sn3", num: "3", s: "SN", x: 195, y: 367, defaultColor: "green" },
  { id: "sn5", num: "5", s: "SN", x: 383, y: 399, defaultColor: "green" },
  { id: "sn9", num: "9", s: "SN", x: 526, y: 417, defaultColor: "green" },
  { id: "sn13", num: "13", s: "SN", x: 620, y: 412, defaultColor: "green" },
  { id: "sn15", num: "15", s: "SN", x: 683, y: 416, defaultColor: "green" },
  { id: "sn17", num: "17", s: "SN", x: 802, y: 402, defaultColor: "green" },
  { id: "sn20", num: "20", s: "SN", x: 862, y: 462, defaultColor: "green" },
  { id: "sn22", num: "22", s: "SN", x: 942, y: 465, defaultColor: "green" },
  // Sanarystraße — ergaenzte Haeuser
  { id: "sn2", num: "2", s: "SN", x: 250, y: 380, defaultColor: "green" },
  { id: "sn4", num: "4", s: "SN", x: 350, y: 396, defaultColor: "green" },
  { id: "sn6", num: "6", s: "SN", x: 420, y: 405, defaultColor: "green" },
  { id: "sn7", num: "7", s: "SN", x: 460, y: 408, defaultColor: "green" },
  { id: "sn8", num: "8", s: "SN", x: 490, y: 412, defaultColor: "green" },
  { id: "sn10", num: "10", s: "SN", x: 560, y: 420, defaultColor: "green" },
  { id: "sn11", num: "11", s: "SN", x: 590, y: 415, defaultColor: "green" },
  { id: "sn12", num: "12", s: "SN", x: 650, y: 418, defaultColor: "green" },
  { id: "sn14", num: "14", s: "SN", x: 720, y: 420, defaultColor: "green" },
  { id: "sn16", num: "16", s: "SN", x: 750, y: 425, defaultColor: "green" },
  { id: "sn18", num: "18", s: "SN", x: 830, y: 440, defaultColor: "green" },
  { id: "sn19", num: "19", s: "SN", x: 880, y: 395, defaultColor: "green" },
  // Oberer Rebberg — Nordseite (gerade, oben)
  { id: "or2a", num: "2a", s: "OR", x: 146, y: 509, defaultColor: "green" },
  { id: "or4", num: "4", s: "OR", x: 252, y: 470, defaultColor: "green" },
  { id: "or6", num: "6", s: "OR", x: 330, y: 466, defaultColor: "green" },
  { id: "or8", num: "8", s: "OR", x: 390, y: 467, defaultColor: "green" },
  { id: "or10", num: "10", s: "OR", x: 458, y: 470, defaultColor: "green" },
  { id: "or12", num: "12", s: "OR", x: 524, y: 470, defaultColor: "green" },
  { id: "or14", num: "14", s: "OR", x: 597, y: 471, defaultColor: "green" },
  { id: "or16", num: "16", s: "OR", x: 666, y: 471, defaultColor: "green" },
  { id: "or18", num: "18", s: "OR", x: 747, y: 469, defaultColor: "green" },
  { id: "or20", num: "20", s: "OR", x: 862, y: 451, defaultColor: "green" },
  { id: "or22a", num: "22a", s: "OR", x: 940, y: 450, defaultColor: "green" },
  // Oberer Rebberg — Suedseite (ungerade, unten)
  { id: "or5", num: "5", s: "OR", x: 199, y: 563, defaultColor: "green" },
  { id: "or7", num: "7", s: "OR", x: 290, y: 580, defaultColor: "green" },
  { id: "or9", num: "9", s: "OR", x: 377, y: 584, defaultColor: "green" },
  { id: "or11", num: "11", s: "OR", x: 431, y: 582, defaultColor: "green" },
  { id: "or13", num: "13", s: "OR", x: 551, y: 613, defaultColor: "green" },
  {
    id: "or1517",
    num: "15-17",
    s: "OR",
    x: 637,
    y: 584,
    defaultColor: "green",
  },
  { id: "or22b", num: "22b", s: "OR", x: 760, y: 596, defaultColor: "green" },
  { id: "or23", num: "23", s: "OR", x: 919, y: 573, defaultColor: "green" },
  { id: "or2b", num: "2b", s: "OR", x: 960, y: 435, defaultColor: "green" },
  // Oberer Rebberg — untere Reihe
  { id: "or10b", num: "10b", s: "OR", x: 199, y: 632, defaultColor: "green" },
  { id: "or12b", num: "12b", s: "OR", x: 285, y: 668, defaultColor: "green" },
  { id: "or14b", num: "14b", s: "OR", x: 394, y: 678, defaultColor: "green" },
  { id: "or16b", num: "16b", s: "OR", x: 484, y: 681, defaultColor: "green" },
  { id: "or18b", num: "18b", s: "OR", x: 539, y: 682, defaultColor: "green" },
  { id: "or20b", num: "20b", s: "OR", x: 613, y: 681, defaultColor: "green" },
  { id: "or22c", num: "22c", s: "OR", x: 673, y: 677, defaultColor: "green" },
  {
    id: "or24_26",
    num: "24-26",
    s: "OR",
    x: 893,
    y: 661,
    defaultColor: "green",
  },
  { id: "or28", num: "28", s: "OR", x: 980, y: 553, defaultColor: "green" },
];

// Laedt Haeuser fuer ein bestimmtes Quartier aus der Datenbank
export async function loadQuarterHouses(
  quarterId: string,
): Promise<MapHouseData[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("map_houses")
    .select("id, house_number, street_code, x, y, default_color")
    .eq("quarter_id", quarterId)
    .order("street_code");

  if (error || !data || data.length === 0) return [];

  return data.map((h) => ({
    id: h.id,
    num: h.house_number,
    s: h.street_code as StreetCode,
    x: h.x,
    y: h.y,
    defaultColor: h.default_color as LampColor,
  }));
}

// Prueft ob ein Quartier Geo-Koordinaten (Leaflet) nutzt statt SVG
export function isGeoQuarter(mapConfig?: Partial<MapConfig>): boolean {
  return mapConfig?.type === "leaflet";
}

// Haversine-Distanz in km (fuer Geo-Validierung)
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Laedt Marker fuer Leaflet-Quartiere — direkt aus households (funktioniert automatisch)
// centerLat/centerLng: Quartier-Zentrum fuer Geo-Validierung (filtert falsche Koordinaten)
export async function loadGeoQuarterHouses(
  quarterId: string,
  centerLat?: number,
  centerLng?: number,
): Promise<GeoMapHouseData[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("households")
    .select("id, street_name, house_number, lat, lng, quarter_id")
    .eq("quarter_id", quarterId)
    .not("lat", "is", null)
    .not("lng", "is", null);

  if (error || !data || data.length === 0) return [];

  return data
    .filter((h) => {
      // Geo-Validierung: Nur Haushalte innerhalb 15km vom Quartier-Zentrum
      if (centerLat && centerLng && h.lat && h.lng) {
        return haversineKm(centerLat, centerLng, h.lat, h.lng) < 15;
      }
      return true;
    })
    .map((h) => ({
      id: h.id,
      num: h.house_number ?? "",
      s: (h.street_name ?? "") as StreetCode,
      x: 0,
      y: 0,
      defaultColor: "green" as LampColor,
      lat: h.lat!,
      lng: h.lng!,
      quarterId: h.quarter_id ?? undefined,
    }));
}

// Parst viewBox-String und gibt Breite/Hoehe zurueck (Fallback: MAP_W x MAP_H)
export function parseViewBox(viewBox?: string): { w: number; h: number } {
  if (!viewBox) return { w: MAP_W, h: MAP_H };
  const parts = viewBox.split(/\s+/).map(Number);
  if (parts.length === 4 && !parts.some(isNaN)) {
    return { w: parts[2], h: parts[3] };
  }
  return { w: MAP_W, h: MAP_H };
}
