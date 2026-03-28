// Bridge: Re-Export aus modules/waste — Abwaertskompatibilitaet fuer Tests und Legacy-Imports
export { runWasteSync } from "@/modules/waste/services/sync-engine";
export type { SyncResult } from "@/modules/waste/types";
