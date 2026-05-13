import { resolveMapActivityPinRule } from "@/lib/map-activity-rules";
import type { MapActivityPin } from "@/lib/map-activity-pins";

export const LOCAL_ACTIVITY_PIN_PREVIEW_CENTER = [
  47.5617,
  7.9475,
] as const satisfies readonly [number, number];

export const LOCAL_ACTIVITY_PIN_PREVIEW_TILE_URL =
  "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png";

// Anonymisierte Haus-Anker aus der bestehenden LGL-BW-WFS-Logik.
// Bewusst ohne Strassen-/Hausnummern, Nutzer oder echte Eventdaten.
export const LOCAL_ACTIVITY_PIN_PREVIEW_HOUSE_ANCHORS = [
  { id: "house-anchor-01", lat: 47.56215, lng: 7.945511 },
  { id: "house-anchor-02", lat: 47.562348, lng: 7.945317 },
  { id: "house-anchor-03", lat: 47.562488, lng: 7.946711 },
  { id: "house-anchor-04", lat: 47.562439, lng: 7.947532 },
  { id: "house-anchor-05", lat: 47.5618, lng: 7.946959 },
  { id: "house-anchor-06", lat: 47.561733, lng: 7.948184 },
  { id: "house-anchor-07", lat: 47.561923, lng: 7.949372 },
  { id: "house-anchor-08", lat: 47.560899, lng: 7.94583 },
  { id: "house-anchor-09", lat: 47.560662, lng: 7.947622 },
  { id: "house-anchor-10", lat: 47.560838, lng: 7.94961 },
] as const satisfies ReadonlyArray<{
  id: string;
  lat: number;
  lng: number;
}>;

function createPreviewPin(
  index: number,
  pin: Pick<MapActivityPin, "id" | "type" | "title" | "description"> & {
    category: string;
    urgency?: string;
    isEmergency?: boolean;
  },
): MapActivityPin {
  const rule = resolveMapActivityPinRule({
    category: pin.category,
    fallbackType: pin.type,
    isEmergency: pin.isEmergency,
    title: pin.title,
    urgency: pin.urgency,
  });
  const anchor = LOCAL_ACTIVITY_PIN_PREVIEW_HOUSE_ANCHORS[index];

  return {
    id: pin.id,
    type: rule.type,
    lat: anchor.lat,
    lng: anchor.lng,
    title: pin.title,
    description: pin.description,
    colorState: rule.colorState,
    locationScope: rule.locationScope,
    urgency: rule.urgency,
    locationPrecision: rule.locationScope === "home" ? "exact" : "approx_50m",
  };
}

export const LOCAL_ACTIVITY_PIN_PREVIEW_PINS: MapActivityPin[] = [
  createPreviewPin(0, {
    category: "learning",
    id: "preview-learning",
    type: "learning",
    title: "Lerntreff am Rhein",
    description: "Gemeinsam lernen, Hausaufgaben, ruhiger Treffpunkt",
  }),
  createPreviewPin(1, {
    category: "meeting",
    id: "preview-meeting",
    type: "meeting",
    title: "Offener Jugendtreff",
    description: "Kurz treffen, reden, neue Leute aus dem Quartier",
  }),
  createPreviewPin(2, {
    category: "sport",
    id: "preview-sport",
    type: "sport",
    title: "Sport & Spiel",
    description: "Kicken, Bewegung, kleine Challenge",
  }),
  createPreviewPin(3, {
    category: "garden",
    id: "preview-mowing",
    type: "mowing",
    title: "Rasenhilfe gesucht",
    description: "Kleine Aufgabe im Quartier, freiwillige Hilfe",
  }),
  createPreviewPin(4, {
    category: "shopping",
    id: "preview-shopping",
    type: "shopping",
    urgency: "urgent",
    title: "Einkauf mitbringen",
    description: "Besorgung unterwegs erledigen",
  }),
  createPreviewPin(5, {
    category: "tech",
    id: "preview-tech",
    type: "tech",
    title: "Handyhilfe",
    description: "App, WLAN, Nachricht oder Foto erklären",
  }),
  createPreviewPin(6, {
    category: "gardening",
    id: "preview-gardening",
    type: "gardening",
    title: "Pflanzaktion",
    description: "Gemeinsam etwas Gruen ins Quartier bringen",
  }),
  createPreviewPin(7, {
    category: "event",
    id: "preview-event",
    type: "event",
    title: "Quartierabend",
    description: "Kleiner Termin, offen fuer alle im Pilotgebiet",
  }),
  createPreviewPin(8, {
    category: "companion",
    id: "preview-companion",
    type: "companion",
    title: "Gemeinsam gehen",
    description: "Sicherer Weg, Begleitung oder Abholen",
  }),
  createPreviewPin(9, {
    category: "warning",
    id: "preview-warning",
    type: "warning",
    isEmergency: true,
    title: "Hinweis im Quartier",
    description: "Beispiel fuer sichtbare, nicht-medizinische Warnlage",
  }),
];
