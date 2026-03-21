// Kommunal-Modul — Konstanten und Konfiguration

import type { ReportCategory, WasteType, AnnouncementCategory } from "./types";

// --- Maengelmelder-Kategorien ---

export const REPORT_CATEGORIES: {
  id: ReportCategory;
  label: string;
  icon: string;
  description: string;
}[] = [
  { id: "street", label: "Straße / Gehweg", icon: "🛣️", description: "Schlagloch, Belag, Markierung" },
  { id: "lighting", label: "Beleuchtung", icon: "💡", description: "Defekte Straßenlaterne" },
  { id: "greenery", label: "Grünfläche / Bäume", icon: "🌳", description: "Umgestürzter Baum, Grünschnitt" },
  { id: "waste", label: "Müll / Verschmutzung", icon: "🗑️", description: "Illegale Ablagerung, Hundekot" },
  { id: "vandalism", label: "Vandalismus", icon: "🔨", description: "Graffiti, beschädigtes Schild" },
  { id: "other", label: "Sonstiges", icon: "❓", description: "Alles andere" },
] as const;

// --- Maengelmelder-Status ---

export const REPORT_STATUS_CONFIG: {
  id: string;
  label: string;
  color: string;
  bgColor: string;
}[] = [
  { id: "open", label: "Offen", color: "text-alert-amber", bgColor: "bg-alert-amber/10" },
  { id: "acknowledged", label: "Gesehen", color: "text-blue-600", bgColor: "bg-blue-50" },
  { id: "in_progress", label: "In Bearbeitung", color: "text-quartier-green", bgColor: "bg-quartier-green/10" },
  { id: "resolved", label: "Erledigt", color: "text-gray-500", bgColor: "bg-gray-100" },
] as const;

// --- Muellarten ---

export const WASTE_TYPES: {
  id: WasteType;
  label: string;
  icon: string;
  color: string;
}[] = [
  { id: "restmuell", label: "Restmüll", icon: "🗑️", color: "#6B7280" },
  { id: "biomuell", label: "Biotonne", icon: "🌱", color: "#92400E" },
  { id: "papier", label: "Papier", icon: "📦", color: "#1E40AF" },
  { id: "gelber_sack", label: "Gelber Sack", icon: "♻️", color: "#F59E0B" },
  { id: "gruenschnitt", label: "Grünschnitt", icon: "🌿", color: "#059669" },
  { id: "sperrmuell", label: "Sperrmüll", icon: "🚛", color: "#7C3AED" },
] as const;

// --- Bekanntmachungs-Kategorien ---

export const ANNOUNCEMENT_CATEGORIES: {
  id: AnnouncementCategory;
  label: string;
  icon: string;
}[] = [
  { id: "verkehr", label: "Verkehr", icon: "🚗" },
  { id: "baustelle", label: "Baustelle", icon: "🚧" },
  { id: "veranstaltung", label: "Veranstaltung", icon: "🎭" },
  { id: "verwaltung", label: "Verwaltung", icon: "🏛️" },
  { id: "warnung", label: "Warnung", icon: "⚠️" },
  { id: "sonstiges", label: "Sonstiges", icon: "📢" },
  { id: "verein", label: "Verein", icon: "⚽" },
  { id: "soziales", label: "Soziales", icon: "🤝" },
  { id: "entsorgung", label: "Entsorgung", icon: "♻️" },
] as const;

// --- Amtsblatt-Kalenderfarben ---

export const ANNOUNCEMENT_CALENDAR_COLORS: Partial<Record<AnnouncementCategory, string>> = {
  veranstaltung: "#8B5CF6",
  verkehr: "#F97316",
  baustelle: "#F97316",
  warnung: "#EF4444",
  soziales: "#EC4899",
  verein: "#06B6D4",
  entsorgung: "#059669",
  verwaltung: "#6B7280",
  sonstiges: "#9CA3AF",
};

// --- Quicklink-Kategorien ---

export const SERVICE_LINK_CATEGORIES = [
  { id: "kontakt", label: "Kontakt & Behörden" },
  { id: "service", label: "Services" },
  { id: "formulare", label: "Formulare & Anträge" },
  { id: "notfall", label: "Notfall" },
  { id: "versorgung", label: "Versorgung" },
] as const;

// --- Wiki-Kategorien ---

export const WIKI_CATEGORIES = [
  { id: "infrastruktur", label: "Infrastruktur" },
  { id: "entsorgung", label: "Entsorgung & Müll" },
  { id: "verwaltung", label: "Verwaltung" },
  { id: "ordnung", label: "Ordnung & Sicherheit" },
  { id: "hilfe", label: "Hilfe & Beratung" },
] as const;

// --- Disclaimer-Texte ---

export const DISCLAIMERS = {
  reportCreate: "Dies ist eine Community-Meldung an Ihre Nachbarschaft. Es handelt sich NICHT um eine offizielle Meldung bei der Stadt.",
  reportPhoto: "Bitte fotografieren Sie nur den Mangel selbst. Vermeiden Sie Personen und Kfz-Kennzeichen.",
  reportRathaus: "Sie können diesen Mangel auch direkt beim Rathaus melden.",
  wasteCalendar: "Alle Angaben ohne Gewähr. Verbindliche Termine finden Sie bei der Abfallwirtschaft.",
  announcements: "Diese Zusammenfassungen wurden automatisch aus dem Amtsblatt der Stadt Bad Säckingen erstellt. Verbindlich ist ausschließlich das Original-Amtsblatt.",
  amtsblattSource: "Quelle: Amtsblatt \u201ETrompeterbl\u00E4ttle\u201C der Stadt Bad S\u00E4ckingen",
} as const;
