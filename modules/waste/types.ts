// Waste-Modul: Gemeinsame Typen fuer den Muellabruf-Kalender
// Extrahiert aus den Service-Dateien fuer zentrale Wiederverwendung

import type { WasteType } from "@/lib/municipal/types";

/** Rohes Ergebnis aus einem Connector (ICS, CSV, API) */
export interface RawWasteDate {
  waste_type: WasteType;
  collection_date: string; // YYYY-MM-DD
  notes: string | null;
  time_hint: string | null;
  raw_summary: string;
}

/** Konfiguration fuer den ICS-Connector */
export interface IcsConnectorConfig {
  url?: string; // ICS-Feed URL (Subscription oder Download)
  encoding?: string; // Default: utf-8
  file_content?: string; // Alternativ: ICS-Inhalt direkt uebergeben (fuer Upload)
}

/** Ergebnis eines ICS-Fetches */
export interface IcsFetchResult {
  success: boolean;
  dates: RawWasteDate[];
  skipped: number; // Events ohne erkannten Muelltyp
  errors: string[];
  total_events: number;
}

/** Ergebnis eines Sync-Laufs fuer eine Quelle */
export interface SyncResult {
  source_slug: string;
  status: "success" | "partial" | "error";
  dates_fetched: number;
  dates_inserted: number;
  dates_updated: number;
  dates_unchanged: number;
  dates_cancelled: number;
  has_changes: boolean;
  errors: string[];
}
