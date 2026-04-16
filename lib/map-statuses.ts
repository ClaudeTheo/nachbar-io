import type { LampColor } from "@/lib/map-houses";

export interface MapStatusMeta {
  chipLabel: string;
  statusLabel: string;
  description: string;
}

export const MAP_STATUS_META: Record<LampColor, MapStatusMeta> = {
  green: {
    chipLabel: "Okay",
    statusLabel: "Alles okay",
    description: "Alles in Ordnung",
  },
  red: {
    chipLabel: "SOS",
    statusLabel: "SOS / kritisch",
    description: "Notfall oder kritische Meldung",
  },
  yellow: {
    chipLabel: "Hilfe",
    statusLabel: "Hilfe gesucht",
    description: "Bewohner braucht Unterstuetzung",
  },
  blue: {
    chipLabel: "Urlaub",
    statusLabel: "Im Urlaub",
    description: "Bewohner sind im Urlaub",
  },
  orange: {
    chipLabel: "Paket",
    statusLabel: "Paketannahme",
    description: "Paketannahme heute aktiv",
  },
};

export const MAP_STATUS_HELP_TEXT = [
  `Okay = ${MAP_STATUS_META.green.description}.`,
  `SOS = ${MAP_STATUS_META.red.description}.`,
  `Hilfe = ${MAP_STATUS_META.yellow.description}.`,
  `Urlaub = ${MAP_STATUS_META.blue.description}.`,
  `Paket = ${MAP_STATUS_META.orange.description}.`,
].join(" ");

const MAP_STATUS_PRIORITY: Record<LampColor, number> = {
  green: 0,
  orange: 1,
  blue: 2,
  yellow: 3,
  red: 4,
};

export function mergeMapStatus(current: LampColor, next: LampColor): LampColor {
  return MAP_STATUS_PRIORITY[next] > MAP_STATUS_PRIORITY[current]
    ? next
    : current;
}
