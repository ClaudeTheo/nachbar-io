// Waste-Modul: Haupt-Barrel-Export
// Zentraler Einstiegspunkt fuer das Muellkalender-Modul

// Service-Funktionen
export {
  mapWasteType,
  extractWasteTypeFromSummary,
} from "./services/type-mapping";
export { fetchIcsWasteDates, checkIcsHealth } from "./services/ics-connector";
export { parseCsvWasteDates } from "./services/csv-connector";
export { runWasteSync } from "./services/sync-engine";

// Typen
export type {
  RawWasteDate,
  IcsConnectorConfig,
  IcsFetchResult,
  SyncResult,
} from "./types";
