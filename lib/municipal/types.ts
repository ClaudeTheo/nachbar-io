// Kommunal-Modul — Typdefinitionen

// --- Enums (passend zu DB-Enums) ---

export type WasteType = "restmuell" | "biomuell" | "papier" | "gelber_sack" | "gruenschnitt" | "sperrmuell";
export type WasteSource = "manual" | "ical" | "api";
export type WasteRemindTime = "evening_before" | "morning_of";

export type ReportCategory = "street" | "lighting" | "greenery" | "waste" | "vandalism" | "other";
export type ReportStatus = "open" | "acknowledged" | "in_progress" | "resolved";

export type AnnouncementCategory = "verkehr" | "baustelle" | "veranstaltung" | "verwaltung" | "warnung" | "sonstiges";

// --- Interfaces ---

export interface ServiceLink {
  label: string;
  url: string;
  icon: string;
  category: string;
}

export interface WikiEntry {
  question: string;
  answer: string;
  category: string;
  links?: { label: string; url: string }[];
}

export interface MunicipalConfig {
  id: string;
  quarter_id: string;
  city_name: string;
  state: string;
  rathaus_url: string | null;
  rathaus_phone: string | null;
  rathaus_email: string | null;
  opening_hours: Record<string, string>;
  features: Record<string, boolean>;
  service_links: ServiceLink[];
  wiki_entries: WikiEntry[];
  created_at: string;
  updated_at: string;
}

export interface WasteSchedule {
  id: string;
  quarter_id: string;
  waste_type: WasteType;
  collection_date: string; // ISO date (YYYY-MM-DD)
  notes: string | null;
  source: WasteSource;
  created_at: string;
}

export interface WasteReminder {
  id: string;
  user_id: string;
  waste_type: WasteType;
  enabled: boolean;
  remind_at: WasteRemindTime;
  created_at: string;
}

export interface MunicipalReport {
  id: string;
  user_id: string;
  quarter_id: string;
  category: ReportCategory;
  description: string | null;
  photo_url: string | null;
  location: { type: "Point"; coordinates: [number, number] } | null;
  location_text: string | null;
  status: ReportStatus;
  status_note: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  user?: { display_name: string; avatar_url: string | null };
  comments_count?: number;
}

export interface MunicipalReportComment {
  id: string;
  report_id: string;
  user_id: string;
  text: string;
  created_at: string;
  // Joins
  user?: { display_name: string; avatar_url: string | null };
}

export interface MunicipalAnnouncement {
  id: string;
  quarter_id: string;
  author_id: string;
  title: string;
  body: string;
  source_url: string | null;
  category: AnnouncementCategory;
  pinned: boolean;
  published_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  author?: { display_name: string };
}
