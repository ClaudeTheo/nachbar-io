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
