// Typen fuer Leistungen-Info-Feature ("Was steht uns zu?")
// Statischer Content — halbjaehrlicher Review-Zyklus.

export type Country = "DE" | "CH";
export type SwissCanton = "AG" | "BL" | "BS" | "SH" | "TG" | "ZH";
export const CURATED_CANTONS: readonly SwissCanton[] = [
  "AG",
  "BL",
  "BS",
  "SH",
  "TG",
  "ZH",
] as const;

export interface CantonVariant {
  amount: string;
  note: string;
  officialLink: string;
}

export interface Leistung {
  slug: string;
  country: Country;
  title: string;
  shortDescription: string;
  longDescription: string;
  amount?: string;
  legalSource: string;
  officialLink: string;
  lastReviewed: string; // ISO 'YYYY-MM-DD'
  cantonVariants?: Partial<Record<SwissCanton, CantonVariant>>;
}

export interface QuarterCountryInput {
  country: string | null;
  state: string | null;
}
