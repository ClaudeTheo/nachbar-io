// -------------------------------------------------------------------
// Gemeinsame Typen und Konstanten für den QuarterWizard
// -------------------------------------------------------------------

export interface WizardFormData {
  // Schritt 1: Grunddaten
  name: string;
  city: string;
  state: string;
  description: string;
  contactEmail: string;
  // Schritt 2: Standort
  centerLat: string;
  centerLng: string;
  zoomLevel: number;
  // Schritt 3: Konfiguration
  invitePrefix: string;
  maxHouseholds: number;
  enableCareModule: boolean;
  enableMarketplace: boolean;
  enableEvents: boolean;
  enablePolls: boolean;
  emergencyBannerEnabled: boolean;
  // Schritt 4: Karte
  mapType: "svg" | "leaflet";
  // Schritt 5: Status
  activateImmediately: boolean;
}

export interface WizardStepProps {
  formData: WizardFormData;
  update: <K extends keyof WizardFormData>(key: K, value: WizardFormData[K]) => void;
}

export const initialFormData: WizardFormData = {
  name: "",
  city: "",
  state: "",
  description: "",
  contactEmail: "",
  centerLat: "",
  centerLng: "",
  zoomLevel: 17,
  invitePrefix: "",
  maxHouseholds: 50,
  enableCareModule: true,
  enableMarketplace: true,
  enableEvents: true,
  enablePolls: true,
  emergencyBannerEnabled: true,
  mapType: "leaflet",
  activateImmediately: false,
};

export const BUNDESLAENDER: Record<string, string> = {
  BW: "Baden-Württemberg",
  BY: "Bayern",
  BE: "Berlin",
  BB: "Brandenburg",
  HB: "Bremen",
  HH: "Hamburg",
  HE: "Hessen",
  MV: "Mecklenburg-Vorpommern",
  NI: "Niedersachsen",
  NW: "Nordrhein-Westfalen",
  RP: "Rheinland-Pfalz",
  SL: "Saarland",
  SN: "Sachsen",
  ST: "Sachsen-Anhalt",
  SH: "Schleswig-Holstein",
  TH: "Thüringen",
};
