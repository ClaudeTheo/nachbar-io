// Aggregator fuer alle 10 Leistungen (5 DE + 5 CH inkl. EL-KuBK).
// Country-basierter Filter liefert die passenden Eintraege je nach Quartier.

import type { Country, Leistung } from "./types";
import { LEISTUNGEN_DE } from "./content-de";
import { LEISTUNGEN_CH_BUND } from "./content-ch-bund";
import { LEISTUNG_CH_EL } from "./content-ch-el";

export const ALL_LEISTUNGEN: readonly Leistung[] = [
  ...LEISTUNGEN_DE,
  ...LEISTUNGEN_CH_BUND,
  LEISTUNG_CH_EL,
] as const;

export function getLeistungenForCountry(country: Country): readonly Leistung[] {
  return ALL_LEISTUNGEN.filter((l) => l.country === country);
}

export { LEISTUNGEN_DE, LEISTUNGEN_CH_BUND, LEISTUNG_CH_EL };
export type {
  Country,
  Leistung,
  SwissCanton,
  CantonVariant,
  QuarterCountryInput,
} from "./types";
