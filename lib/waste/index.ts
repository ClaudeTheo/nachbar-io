// Bridge: Re-Export aus modules/waste — Abwaertskompatibilitaet
// Alle Imports auf @/modules/waste umstellen

export {
  mapWasteType,
  extractWasteTypeFromSummary,
} from "@/modules/waste/services/type-mapping";
export {
  fetchIcsWasteDates,
  checkIcsHealth,
} from "@/modules/waste/services/ics-connector";
export { parseCsvWasteDates } from "@/modules/waste/services/csv-connector";
export { runWasteSync } from "@/modules/waste/services/sync-engine";
export type {
  RawWasteDate,
  IcsConnectorConfig,
  IcsFetchResult,
} from "@/modules/waste/types";
export type { SyncResult } from "@/modules/waste/types";
