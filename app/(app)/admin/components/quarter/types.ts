// Typen und Konstanten fuer QuarterManagement-Subkomponenten

export type { QuarterWithStats, QuarterSettings, QuarterAdmin } from "@/lib/quarters/types";

export interface QuarterFormData {
  name: string;
  city: string;
  state: string;
  description: string;
  center_lat: string;
  center_lng: string;
  invite_prefix: string;
  max_households: string;
  contact_email: string;
}

export const emptyForm: QuarterFormData = {
  name: "",
  city: "",
  state: "",
  description: "",
  center_lat: "",
  center_lng: "",
  invite_prefix: "",
  max_households: "50",
  contact_email: "",
};

export const statusColors: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800 border-yellow-300",
  active: "bg-green-100 text-green-800 border-green-300",
  archived: "bg-gray-100 text-gray-500 border-gray-300",
};

export const statusLabels: Record<string, string> = {
  draft: "Entwurf",
  active: "Aktiv",
  archived: "Archiviert",
};
