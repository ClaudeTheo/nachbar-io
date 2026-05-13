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

export type MapActivityPinUrgency =
  | "normal"
  | "urgent"
  | "emergency"
  | "status";

export type MapActivityPinColorState = "green" | "yellow" | "red" | "blue";

export type MapActivityPinLocationScope =
  | "home"
  | "meeting_point"
  | "quarter_area"
  | "external_place";

export type MapActivityPinLocationPrecision =
  | "exact"
  | "approx_50m"
  | "approx_quarter";

export type MapActivityPinVisibility =
  | "public"
  | "youth_safe"
  | "adult"
  | "caregiver"
  | "own";

export type MapActivityPinSource =
  | "alerts"
  | "events"
  | "help_requests"
  | "youth_tasks";

export interface MapActivityPinDefinition {
  type: MapActivityPinType;
  label: string;
  shortLabel: string;
  description: string;
  category: MapActivityPinCategory;
  color: `#${string}`;
  glowColor: string;
}

export interface MapActivityPinColorDefinition {
  state: MapActivityPinColorState;
  label: string;
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
  locationPrecision?: MapActivityPinLocationPrecision;
  urgency?: MapActivityPinUrgency;
  colorState?: MapActivityPinColorState;
  locationScope?: MapActivityPinLocationScope;
  visibility?: MapActivityPinVisibility;
  source?: MapActivityPinSource;
  startsAt?: string;
  href?: string;
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

export const MAP_ACTIVITY_PIN_COLOR_STATES: Record<
  MapActivityPinColorState,
  MapActivityPinColorDefinition
> = {
  green: {
    state: "green",
    label: "Normal",
    color: "#8AC65A",
    glowColor: "rgba(138, 198, 90, 0.72)",
  },
  yellow: {
    state: "yellow",
    label: "Dringend",
    color: "#F0B21B",
    glowColor: "rgba(240, 178, 27, 0.76)",
  },
  red: {
    state: "red",
    label: "Notfall",
    color: "#EF4444",
    glowColor: "rgba(239, 68, 68, 0.78)",
  },
  blue: {
    state: "blue",
    label: "Sonderstatus",
    color: "#43B7E7",
    glowColor: "rgba(67, 183, 231, 0.74)",
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

export function isMapActivityPinColorState(
  value: unknown,
): value is MapActivityPinColorState {
  return (
    typeof value === "string" &&
    Object.hasOwn(MAP_ACTIVITY_PIN_COLOR_STATES, value)
  );
}

export function getMapActivityPinDefinition(
  value: unknown,
): MapActivityPinDefinition {
  return isMapActivityPinType(value)
    ? MAP_ACTIVITY_PIN_DEFINITIONS[value]
    : MAP_ACTIVITY_PIN_DEFINITIONS.learning;
}

export function getMapActivityPinColorDefinition(
  value: unknown,
  fallbackType: MapActivityPinType,
): MapActivityPinColorDefinition {
  if (isMapActivityPinColorState(value)) {
    return MAP_ACTIVITY_PIN_COLOR_STATES[value];
  }

  const definition = getMapActivityPinDefinition(fallbackType);
  const fallbackState = definition.category === "warning" ? "red" : "green";
  const fallbackColorDefinition = MAP_ACTIVITY_PIN_COLOR_STATES[fallbackState];

  return {
    state: fallbackState,
    label: definition.label,
    color: fallbackColorDefinition.color,
    glowColor: fallbackColorDefinition.glowColor,
  };
}

const MAP_ACTIVITY_PIN_SYMBOL_MARKUP: Record<MapActivityPinType, string> = {
  learning: [
    '<path data-detail="book-left" d="M-27 -20C-17 -25 -8 -21 0 -14V22C-8 15 -18 13 -27 18V-20Z"/>',
    '<path data-detail="book-right" d="M0 -14C8 -21 17 -25 27 -20V18C18 13 8 15 0 22V-14Z"/>',
    '<path data-detail="book-spine" d="M0 -14V22"/>',
    '<path data-detail="page-line" d="M-20 -7C-13 -10 -7 -9 -3 -5"/>',
    '<path data-detail="pencil" d="M11 7L28 24"/>',
    '<path data-detail="pencil-tip" d="M28 24L31 16"/>',
  ].join(""),
  meeting: [
    '<circle data-detail="left-person" cx="-17" cy="-12" r="7"/>',
    '<circle data-detail="third-person" cx="0" cy="-19" r="6"/>',
    '<circle data-detail="right-person" cx="17" cy="-12" r="7"/>',
    '<path data-detail="left-body" d="M-30 19C-26 4 -10 4 -6 19"/>',
    '<path data-detail="center-body" d="M-13 18C-10 5 10 5 13 18"/>',
    '<path data-detail="right-body" d="M6 19C10 4 26 4 30 19"/>',
    '<path data-detail="chat-line" d="M-19 27H12L21 34"/>',
  ].join(""),
  sport: [
    '<circle data-detail="ball" cx="-1" cy="0" r="21"/>',
    '<path data-detail="ball-panel" d="M-1 -21V21"/>',
    '<path data-detail="ball-panel" d="M-18 -8C-8 -2 6 -2 16 -8"/>',
    '<path data-detail="ball-panel" d="M-15 15C-8 8 6 8 13 15"/>',
    '<path data-detail="motion-kick" d="M-30 23C-19 15 -9 14 0 21"/>',
    '<path data-detail="motion-kick" d="M19 -20L30 -28"/>',
  ].join(""),
  mowing: [
    '<path data-detail="mower-deck" d="M-27 9H12L25 -2"/>',
    '<path data-detail="blade" d="M-21 2H1"/>',
    '<circle data-detail="wheel" cx="-15" cy="18" r="6"/>',
    '<circle data-detail="wheel" cx="13" cy="18" r="6"/>',
    '<path data-detail="mower-handle" d="M-19 9L-6 -14H13L29 -30"/>',
    '<path data-detail="grass-cut" d="M-31 27H-22"/>',
    '<path data-detail="grass-cut" d="M-3 27H8"/>',
    '<path data-detail="grass-cut" d="M21 27H31"/>',
  ].join(""),
  shopping: [
    '<path data-detail="shopping-bag" d="M-22 -3H22L18 27H-18L-22 -3Z"/>',
    '<path data-detail="bag-handle" d="M-11 -3C-11 -21 11 -21 11 -3"/>',
    '<path data-detail="box-item" d="M-10 7H10"/>',
    '<path data-detail="box-item" d="M-7 17H7"/>',
    '<path data-detail="receipt" d="M17 -12L27 -20"/>',
  ].join(""),
  tech: [
    '<rect data-detail="phone" x="-15" y="-25" width="30" height="52" rx="8"/>',
    '<path data-detail="phone-screen" d="M-6 -14H6"/>',
    '<path data-detail="phone-screen" d="M-7 -2H7"/>',
    '<path data-detail="home-line" d="M-4 18H4"/>',
    '<path data-detail="wifi-signal" d="M-30 -20C-21 -30 -8 -34 5 -30"/>',
    '<path data-detail="wifi-signal" d="M-25 -9C-18 -17 -8 -20 2 -16"/>',
  ].join(""),
  gardening: [
    '<path data-detail="leaf-pair" d="M-2 19C0 0 10 -19 30 -27C30 -5 16 9 -2 19Z"/>',
    '<path data-detail="leaf-pair" d="M-4 20C-8 1 -18 -12 -31 -18C-30 1 -18 12 -4 20Z"/>',
    '<path data-detail="stem" d="M-3 24V-13"/>',
    '<path data-detail="soil-line" d="M-26 27C-13 22 12 22 26 27"/>',
    '<path data-detail="sprout" d="M-3 4C6 1 12 -2 17 -9"/>',
  ].join(""),
  event: [
    '<rect data-detail="calendar" x="-25" y="-22" width="50" height="44" rx="7"/>',
    '<path data-detail="calendar-top" d="M-25 -8H25"/>',
    '<path data-detail="calendar-ring" d="M-13 -30V-17"/>',
    '<path data-detail="calendar-ring" d="M13 -30V-17"/>',
    '<path data-detail="calendar-grid" d="M-13 5H-5"/>',
    '<path data-detail="calendar-grid" d="M6 5H14"/>',
    '<path data-detail="star" d="M0 11L3 17L10 18L5 23L6 30L0 26L-6 30L-5 23L-10 18L-3 17L0 11Z"/>',
  ].join(""),
  companion: [
    '<circle data-detail="person-a" cx="-14" cy="-17" r="7"/>',
    '<circle data-detail="person-b" cx="15" cy="-15" r="7"/>',
    '<path data-detail="body-a" d="M-29 20C-25 4 -5 4 -1 20"/>',
    '<path data-detail="body-b" d="M1 22C5 5 26 5 30 22"/>',
    '<path data-detail="help-hand" d="M-3 3C3 8 10 8 16 2"/>',
    '<path data-detail="path-line" d="M-30 31C-14 25 7 25 30 31"/>',
  ].join(""),
  warning: [
    '<path data-detail="warning-triangle" d="M0 -31L31 24H-31L0 -31Z"/>',
    '<path data-detail="exclamation" d="M0 -13V6"/>',
    '<path data-detail="exclamation" d="M0 17H0.5"/>',
    '<path data-detail="warning-rays" d="M-25 -25L-32 -32"/>',
    '<path data-detail="warning-rays" d="M25 -25L32 -32"/>',
    '<path data-detail="warning-rays" d="M0 -39V-31"/>',
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
    colorState?: MapActivityPinColorState;
  } = {},
): string {
  const definition = getMapActivityPinDefinition(type);
  const colorDefinition = getMapActivityPinColorDefinition(
    options.colorState,
    definition.type,
  );
  const size = Math.max(24, Math.round(options.size ?? 52));
  const height = Math.round((size * 4) / 3);
  const innerGlow = Math.max(2, Math.round(size * 0.09));
  const outerGlow = Math.max(5, Math.round(size * 0.22));
  const label = escapeHtml(
    options.title ?? `${definition.label} auf der Quartierskarte`,
  );
  const symbol = MAP_ACTIVITY_PIN_SYMBOL_MARKUP[definition.type];

  return [
    `<svg role="img" aria-label="${label}" data-activity-pin-type="${definition.type}" data-activity-pin-color-state="${colorDefinition.state}" width="${size}" height="${height}" viewBox="0 0 96 128" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible;filter:drop-shadow(0 0 ${innerGlow}px ${colorDefinition.color}) drop-shadow(0 0 ${outerGlow}px ${colorDefinition.color});">`,
    `<title>${label}</title>`,
    `<path d="M48 4C73 4 92 23 92 48C92 79 65 98 48 124C31 98 4 79 4 48C4 23 23 4 48 4Z" fill="${colorDefinition.color}" stroke="white" stroke-width="5.5" stroke-linejoin="round"/>`,
    '<circle cx="48" cy="47" r="30" fill="white" opacity="0.1"/>',
    `<g data-activity-pin-symbol="${definition.type}" stroke="white" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" fill="none" transform="translate(48 45)">`,
    symbol,
    "</g>",
    "</svg>",
  ].join("");
}
