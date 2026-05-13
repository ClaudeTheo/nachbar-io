export const MAP_ACTIVITY_PIN_TYPES = [
  "learning",
  "meeting",
  "sport",
  "mowing",
  "shopping",
  "tech",
  "gardening",
  "event",
  "companion",
  "warning",
] as const;

export type MapActivityPinType = (typeof MAP_ACTIVITY_PIN_TYPES)[number];

export type MapActivityPinCategory =
  | "community"
  | "active"
  | "info"
  | "warning";

export interface MapActivityPinDefinition {
  type: MapActivityPinType;
  label: string;
  shortLabel: string;
  description: string;
  category: MapActivityPinCategory;
  color: `#${string}`;
  glowColor: string;
}

export interface MapActivityPin {
  id: string;
  type: MapActivityPinType;
  lat: number;
  lng: number;
  title: string;
  description?: string;
  approximate?: boolean;
}

export const MAP_ACTIVITY_PIN_DEFINITIONS: Record<
  MapActivityPinType,
  MapActivityPinDefinition
> = {
  learning: {
    type: "learning",
    label: "Lernen",
    shortLabel: "Lernen",
    description: "Lern-Treffen, Hausaufgabenhilfe oder ruhige Lerngruppe",
    category: "community",
    color: "#8AC65A",
    glowColor: "rgba(138, 198, 90, 0.72)",
  },
  meeting: {
    type: "meeting",
    label: "Treffen",
    shortLabel: "Treff",
    description: "Offenes Treffen oder kleiner Treffpunkt im Quartier",
    category: "community",
    color: "#7FB84E",
    glowColor: "rgba(127, 184, 78, 0.72)",
  },
  sport: {
    type: "sport",
    label: "Sport / Spiel",
    shortLabel: "Sport",
    description: "Sport, Spiel, Bewegung oder Freizeitaktion",
    category: "active",
    color: "#F0B21B",
    glowColor: "rgba(240, 178, 27, 0.76)",
  },
  mowing: {
    type: "mowing",
    label: "Rasen maehen",
    shortLabel: "Maehen",
    description: "Nachbarschaftshilfe rund um Rasen und kleine Aufgaben",
    category: "community",
    color: "#83B54F",
    glowColor: "rgba(131, 181, 79, 0.72)",
  },
  shopping: {
    type: "shopping",
    label: "Einkaufshilfe",
    shortLabel: "Einkauf",
    description: "Einkauf, Besorgung oder kleine Bring-Hilfe",
    category: "active",
    color: "#EDA814",
    glowColor: "rgba(237, 168, 20, 0.76)",
  },
  tech: {
    type: "tech",
    label: "Handy / Technik",
    shortLabel: "Technik",
    description: "Hilfe mit Handy, App, Internet oder digitalen Fragen",
    category: "info",
    color: "#43B7E7",
    glowColor: "rgba(67, 183, 231, 0.74)",
  },
  gardening: {
    type: "gardening",
    label: "Garten / Pflanzen",
    shortLabel: "Garten",
    description: "Pflanzen, Gartenaktion oder gemeinsames Gruenprojekt",
    category: "community",
    color: "#87B84D",
    glowColor: "rgba(135, 184, 77, 0.72)",
  },
  event: {
    type: "event",
    label: "Veranstaltung",
    shortLabel: "Event",
    description: "Quartier-Termin, Aktion oder lokales Event",
    category: "active",
    color: "#F2B51B",
    glowColor: "rgba(242, 181, 27, 0.76)",
  },
  companion: {
    type: "companion",
    label: "Begleitung",
    shortLabel: "Begleitung",
    description: "Begleitung, gemeinsamer Weg oder sicheres Ankommen",
    category: "info",
    color: "#4BBCE9",
    glowColor: "rgba(75, 188, 233, 0.74)",
  },
  warning: {
    type: "warning",
    label: "Warnung",
    shortLabel: "Warnung",
    description: "Wichtiger Hinweis oder sichtbare Warnlage im Quartier",
    category: "warning",
    color: "#EF4444",
    glowColor: "rgba(239, 68, 68, 0.78)",
  },
};

export function isMapActivityPinType(
  value: unknown,
): value is MapActivityPinType {
  return (
    typeof value === "string" &&
    Object.hasOwn(MAP_ACTIVITY_PIN_DEFINITIONS, value)
  );
}

export function getMapActivityPinDefinition(
  value: unknown,
): MapActivityPinDefinition {
  return isMapActivityPinType(value)
    ? MAP_ACTIVITY_PIN_DEFINITIONS[value]
    : MAP_ACTIVITY_PIN_DEFINITIONS.learning;
}

const MAP_ACTIVITY_PIN_SYMBOL_MARKUP: Record<MapActivityPinType, string> = {
  learning: [
    '<path d="M-22 -17C-13 -22 -6 -20 0 -14C6 -20 14 -22 22 -17V18C14 13 7 13 0 20C-7 13 -14 13 -22 18V-17Z"/>',
    '<path d="M0 -14V20"/>',
  ].join(""),
  meeting: [
    '<circle cx="-12" cy="-12" r="8"/>',
    '<circle cx="13" cy="-12" r="8"/>',
    '<path d="M-27 18C-24 4 -1 4 2 18"/>',
    '<path d="M2 18C5 4 28 4 31 18"/>',
  ].join(""),
  sport: [
    '<circle cx="0" cy="0" r="24"/>',
    '<path d="M-18 -9C-5 -2 5 -2 18 -9"/>',
    '<path d="M-12 18C-5 8 5 8 12 18"/>',
    '<path d="M0 -24V24"/>',
  ].join(""),
  mowing: [
    '<path d="M-24 10H12L23 0"/>',
    '<circle cx="-13" cy="17" r="6"/>',
    '<circle cx="14" cy="17" r="6"/>',
    '<path d="M-18 10L-5 -12H12"/>',
    '<path d="M12 -12L27 -28"/>',
  ].join(""),
  shopping: [
    '<path d="M-20 -3H20L16 25H-16L-20 -3Z"/>',
    '<path d="M-10 -3C-10 -20 10 -20 10 -3"/>',
  ].join(""),
  tech: [
    '<rect x="-15" y="-28" width="30" height="56" rx="8"/>',
    '<path d="M-4 18H4"/>',
    '<path d="M-22 -22L-31 -31"/>',
    '<path d="M22 -22L31 -31"/>',
  ].join(""),
  gardening: [
    '<path d="M-2 24C-1 3 8 -19 29 -27C31 -4 16 11 -2 24Z"/>',
    '<path d="M-4 23C-8 2 -18 -14 -31 -20C-31 0 -19 12 -4 23Z"/>',
    '<path d="M-2 24V-12"/>',
  ].join(""),
  event: [
    '<rect x="-24" y="-22" width="48" height="44" rx="7"/>',
    '<path d="M-24 -8H24"/>',
    '<path d="M-12 -30V-17"/>',
    '<path d="M12 -30V-17"/>',
    '<path d="M-12 6H-4"/>',
    '<path d="M8 6H16"/>',
  ].join(""),
  companion: [
    '<circle cx="-12" cy="-16" r="8"/>',
    '<circle cx="14" cy="-16" r="8"/>',
    '<path d="M-27 24C-22 5 -2 5 2 24"/>',
    '<path d="M2 24C6 5 27 5 31 24"/>',
    '<path d="M-1 4C4 0 9 0 14 4"/>',
  ].join(""),
  warning: [
    '<path d="M0 -30L30 24H-30L0 -30Z"/>',
    '<path d="M0 -12V6"/>',
    '<path d="M0 17H0.5"/>',
  ].join(""),
};

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}

export function createMapActivityPinSvgMarkup(
  type: unknown,
  options: {
    size?: number;
    title?: string;
  } = {},
): string {
  const definition = getMapActivityPinDefinition(type);
  const size = Math.max(24, Math.round(options.size ?? 52));
  const height = Math.round((size * 4) / 3);
  const label = escapeHtml(
    options.title ?? `${definition.label} auf der Quartierskarte`,
  );
  const symbol = MAP_ACTIVITY_PIN_SYMBOL_MARKUP[definition.type];

  return [
    `<svg role="img" aria-label="${label}" data-activity-pin-type="${definition.type}" width="${size}" height="${height}" viewBox="0 0 96 128" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible;filter:drop-shadow(0 0 6px ${definition.color}) drop-shadow(0 0 16px ${definition.color});">`,
    `<title>${label}</title>`,
    `<path d="M48 4C73 4 92 23 92 48C92 79 65 98 48 124C31 98 4 79 4 48C4 23 23 4 48 4Z" fill="${definition.color}" stroke="white" stroke-width="5.5" stroke-linejoin="round"/>`,
    '<circle cx="48" cy="47" r="30" fill="white" opacity="0.1"/>',
    `<g data-activity-pin-symbol="${definition.type}" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none" transform="translate(48 45)">`,
    symbol,
    "</g>",
    "</svg>",
  ].join("");
}
