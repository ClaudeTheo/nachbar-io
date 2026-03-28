// Barrel Export: Quartier-Info-Hub
// Alle oeffentlichen Exporte fuer @/lib/info

// Typen
export type {
  QuartierWeatherDay,
  QuartierWeather,
  NinaSeverity,
  NinaWarning,
  PollenIntensity,
  PollenEntry,
  PollenData,
  WasteNext,
  RathausLink,
  OepnvDeparture,
  OepnvStop,
  Apotheke,
  LocalEvent,
  QuartierInfoResponse,
} from "./types";

// Wetter
export { wmoToIcon, fetchWeather } from "./weather-client";

// NINA-Warnungen
export { fetchNinaWarnings } from "./nina-client";

// Pollenflug
export { fetchPollenData } from "./pollen-client";

// OEPNV
export { fetchDepartures } from "./oepnv-client";
export type { OepnvStopConfig } from "./oepnv-stops";
export {
  OEPNV_STOPS_BAD_SAECKINGEN,
  EFA_BW_BASE_URL,
  EFA_BW_DEPARTURE_URL,
} from "./oepnv-stops";

// Apotheken
export { APOTHEKEN_BAD_SAECKINGEN, NOTDIENST_URL } from "./apotheken";

// Events
export { EVENTS_BAD_SAECKINGEN, EVENTS_CALENDAR_URL } from "./events";

// Rathaus-Links
export { RATHAUS_LINKS } from "./rathaus-links";
