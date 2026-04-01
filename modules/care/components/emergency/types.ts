// Notfallmappe Datentypen — 3 Ebenen nach DRK-Vorbild
// Level 1: Notfalldose (Pflicht), Level 2: Vorsorge (optional), Level 3: Erweitert (optional)

export interface Level1Data {
  fullName: string;
  dateOfBirth: string;
  bloodType: string;
  allergies: string;
  medications: string;
  conditions: string;
  implants: string;
  patientenverfuegung: boolean;
  emergencyContact1: { name: string; phone: string; relation: string };
  emergencyContact2: { name: string; phone: string; relation: string };
}

export interface Level2Data {
  vorsorgevollmacht: boolean;
  vorsorgevollmachtLocation: string;
  betreuungsverfuegung: boolean;
  betreuungsverfuegungLocation: string;
  organspende: "ja" | "nein" | "eingeschraenkt" | "";
  organspendeDetails: string;
  bestattungswunsch: string;
}

export interface Level3Data {
  insuranceName: string;
  insuranceNumber: string;
  pflegegrad: number;
  behinderungsgrad: number;
  hilfsmittel: string;
  schluesselStandort: string;
  haustiere: string;
  sonstigeHinweise: string;
}

export interface EmergencyProfile {
  id: string;
  userId: string;
  level1: Level1Data;
  level2: Level2Data | null;
  level3: Level3Data | null;
  pdfToken: string | null;
  updatedAt: string;
}

// Leere Initialdaten
export const EMPTY_LEVEL1: Level1Data = {
  fullName: "",
  dateOfBirth: "",
  bloodType: "",
  allergies: "",
  medications: "",
  conditions: "",
  implants: "",
  patientenverfuegung: false,
  emergencyContact1: { name: "", phone: "", relation: "" },
  emergencyContact2: { name: "", phone: "", relation: "" },
};

export const EMPTY_LEVEL2: Level2Data = {
  vorsorgevollmacht: false,
  vorsorgevollmachtLocation: "",
  betreuungsverfuegung: false,
  betreuungsverfuegungLocation: "",
  organspende: "",
  organspendeDetails: "",
  bestattungswunsch: "",
};

export const EMPTY_LEVEL3: Level3Data = {
  insuranceName: "",
  insuranceNumber: "",
  pflegegrad: 0,
  behinderungsgrad: 0,
  hilfsmittel: "",
  schluesselStandort: "",
  haustiere: "",
  sonstigeHinweise: "",
};

// Blutgruppen-Optionen
export const BLOOD_TYPE_OPTIONS = [
  "",
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "0+",
  "0-",
  "Unbekannt",
] as const;

// Organspende-Optionen
export const ORGAN_DONATION_OPTIONS = [
  { value: "" as const, label: "Keine Angabe" },
  { value: "ja" as const, label: "Ja, uneingeschraenkt" },
  { value: "eingeschraenkt" as const, label: "Ja, mit Einschraenkungen" },
  { value: "nein" as const, label: "Nein" },
];
