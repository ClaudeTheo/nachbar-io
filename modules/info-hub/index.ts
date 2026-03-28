// Barrel Export: Info-Hub Feature-Modul
// Alle oeffentlichen Exporte fuer @/modules/info-hub

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
export { wmoToIcon, fetchWeather } from "./services/weather-client";

// NINA-Warnungen
export { fetchNinaWarnings } from "./services/nina-client";

// Pollenflug
export { fetchPollenData } from "./services/pollen-client";

// OEPNV
export { fetchDepartures } from "./services/oepnv-client";
export type { OepnvStopConfig } from "./services/oepnv-stops";
export {
  OEPNV_STOPS_BAD_SAECKINGEN,
  EFA_BW_BASE_URL,
  EFA_BW_DEPARTURE_URL,
} from "./services/oepnv-stops";

// Apotheken
export { APOTHEKEN_BAD_SAECKINGEN, NOTDIENST_URL } from "./services/apotheken";

// Events
export { EVENTS_BAD_SAECKINGEN, EVENTS_CALENDAR_URL } from "./services/events";

// Rathaus-Links
export { RATHAUS_LINKS } from "./services/rathaus-links";

// Komponenten
export { InfoBar } from "./components/InfoBar";
export { NinaAlert } from "./components/NinaAlert";
