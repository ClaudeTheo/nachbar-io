// Bridge: Re-Export aus modules/waste — Abwaertskompatibilitaet fuer Tests und Legacy-Imports
export {
  fetchIcsWasteDates,
  checkIcsHealth,
} from "@/modules/waste/services/ics-connector";
export type {
  RawWasteDate,
  IcsConnectorConfig,
  IcsFetchResult,
} from "@/modules/waste/types";
