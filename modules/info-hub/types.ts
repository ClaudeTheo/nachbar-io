// Info-Hub: Gemeinsame Typen
// Zentrales Typen-Modul fuer den Quartier-Info-Hub

// Wetter (Open-Meteo)
export interface QuartierWeatherDay {
  day: string; // Deutscher Kurzname: "Mo", "Di", "Mi", ...
  tempMax: number; // Tageshöchsttemperatur in °C (gerundet)
  icon: string; // Icon-Schluessel (sun/cloud/rain/snow/fog/storm)
}

export interface QuartierWeather {
  temp: number | null;
  icon: string;
  description: string;
  forecast: QuartierWeatherDay[];
}

// NINA-Warnungen (Bundesamt fuer Bevoelkerungsschutz)
export type NinaSeverity = "Extreme" | "Severe" | "Moderate" | "Minor";

export interface NinaWarning {
  id: string;
  warning_id: string;
  severity: NinaSeverity;
  headline: string;
  description: string | null;
  sent_at: string;
  expires_at: string | null;
}

// Pollenflug (DWD)
export type PollenIntensity = 0 | 0.5 | 1 | 1.5 | 2 | 2.5 | 3;

export interface PollenEntry {
  today: PollenIntensity;
  tomorrow: PollenIntensity;
}

export interface PollenData {
  region: string;
  pollen: Record<string, PollenEntry>;
}

// Muellabfuhr (naechster Termin)
export interface WasteNext {
  date: string;
  type: string;
  label: string;
}

// Rathaus-Links
export interface RathausLink {
  label: string;
  description: string;
  url: string;
  icon: string;
}

// ÖPNV-Abfahrten (EFA-BW)
export interface OepnvDeparture {
  line: string; // "7334", "SEV C"
  destination: string; // "Waldshut Busbahnhof"
  time: string; // "12:28" (HH:MM)
  platform: string; // "14"
  countdown: number; // Minuten bis Abfahrt
  hint?: string; // "Ersatzverkehr", "Fahrradmitnahme"
}

export interface OepnvStop {
  id: string; // "8506566"
  name: string; // "Bad Säckingen Bahnhof"
  departures: OepnvDeparture[];
}

// Apotheken (statisch)
export interface Apotheke {
  name: string;
  address: string;
  phone: string;
  openingHours: string;
}

// Veranstaltungen (statisch)
export interface LocalEvent {
  title: string;
  description: string;
  schedule: string; // "Mi + Sa, 08:00-12:00"
  location: string;
  icon: string;
}

// Gesamt-Response der API
export interface QuartierInfoResponse {
  weather: QuartierWeather | null;
  nina: NinaWarning[];
  pollen: PollenData | null;
  waste_next: WasteNext[];
  rathaus: RathausLink[];
  // Phase 2
  oepnv: OepnvStop[];
  apotheken: Apotheke[];
  events: LocalEvent[];
  notdienst_url: string;
  events_calendar_url: string;
}
