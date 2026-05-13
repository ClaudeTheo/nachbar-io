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

export const LOCAL_ACTIVITY_PIN_PREVIEW_PINS: MapActivityPin[] = [
  {
    id: "preview-learning",
    type: "learning",
    lat: LOCAL_ACTIVITY_PIN_PREVIEW_HOUSE_ANCHORS[0].lat,
    lng: LOCAL_ACTIVITY_PIN_PREVIEW_HOUSE_ANCHORS[0].lng,
    title: "Lerntreff am Rhein",
    description: "Gemeinsam lernen, Hausaufgaben, ruhiger Treffpunkt",
  },
  {
    id: "preview-meeting",
    type: "meeting",
    lat: LOCAL_ACTIVITY_PIN_PREVIEW_HOUSE_ANCHORS[1].lat,
    lng: LOCAL_ACTIVITY_PIN_PREVIEW_HOUSE_ANCHORS[1].lng,
    title: "Offener Jugendtreff",
    description: "Kurz treffen, reden, neue Leute aus dem Quartier",
  },
  {
    id: "preview-sport",
    type: "sport",
    lat: LOCAL_ACTIVITY_PIN_PREVIEW_HOUSE_ANCHORS[2].lat,
    lng: LOCAL_ACTIVITY_PIN_PREVIEW_HOUSE_ANCHORS[2].lng,
    title: "Sport & Spiel",
    description: "Kicken, Bewegung, kleine Challenge",
  },
  {
    id: "preview-mowing",
    type: "mowing",
    lat: LOCAL_ACTIVITY_PIN_PREVIEW_HOUSE_ANCHORS[3].lat,
    lng: LOCAL_ACTIVITY_PIN_PREVIEW_HOUSE_ANCHORS[3].lng,
    title: "Rasenhilfe gesucht",
    description: "Kleine Aufgabe im Quartier, freiwillige Hilfe",
  },
  {
    id: "preview-shopping",
    type: "shopping",
    lat: LOCAL_ACTIVITY_PIN_PREVIEW_HOUSE_ANCHORS[4].lat,
    lng: LOCAL_ACTIVITY_PIN_PREVIEW_HOUSE_ANCHORS[4].lng,
    title: "Einkauf mitbringen",
    description: "Besorgung unterwegs erledigen",
  },
  {
    id: "preview-tech",
    type: "tech",
    lat: LOCAL_ACTIVITY_PIN_PREVIEW_HOUSE_ANCHORS[5].lat,
    lng: LOCAL_ACTIVITY_PIN_PREVIEW_HOUSE_ANCHORS[5].lng,
    title: "Handyhilfe",
    description: "App, WLAN, Nachricht oder Foto erklären",
  },
  {
    id: "preview-gardening",
    type: "gardening",
    lat: LOCAL_ACTIVITY_PIN_PREVIEW_HOUSE_ANCHORS[6].lat,
    lng: LOCAL_ACTIVITY_PIN_PREVIEW_HOUSE_ANCHORS[6].lng,
    title: "Pflanzaktion",
    description: "Gemeinsam etwas Gruen ins Quartier bringen",
  },
  {
    id: "preview-event",
    type: "event",
    lat: LOCAL_ACTIVITY_PIN_PREVIEW_HOUSE_ANCHORS[7].lat,
    lng: LOCAL_ACTIVITY_PIN_PREVIEW_HOUSE_ANCHORS[7].lng,
    title: "Quartierabend",
    description: "Kleiner Termin, offen fuer alle im Pilotgebiet",
  },
  {
    id: "preview-companion",
    type: "companion",
    lat: LOCAL_ACTIVITY_PIN_PREVIEW_HOUSE_ANCHORS[8].lat,
    lng: LOCAL_ACTIVITY_PIN_PREVIEW_HOUSE_ANCHORS[8].lng,
    title: "Gemeinsam gehen",
    description: "Sicherer Weg, Begleitung oder Abholen",
  },
  {
    id: "preview-warning",
    type: "warning",
    lat: LOCAL_ACTIVITY_PIN_PREVIEW_HOUSE_ANCHORS[9].lat,
    lng: LOCAL_ACTIVITY_PIN_PREVIEW_HOUSE_ANCHORS[9].lng,
    title: "Hinweis im Quartier",
    description: "Beispiel fuer sichtbare, nicht-medizinische Warnlage",
  },
];
