// Jugend-Tauschboerse: bewusst ohne Verkauf, Zahlung oder Adresslogik.

export type YouthExchangeType = "swap" | "give";

export const YOUTH_EXCHANGE_TYPES = [
  {
    id: "swap",
    label: "Tauschen",
    description: "Dinge im Quartier tauschen, ohne Geld und ohne Druck.",
  },
  {
    id: "give",
    label: "Verschenken",
    description: "Was noch gut ist, darf im Quartier weiterziehen.",
  },
] as const;

export const YOUTH_EXCHANGE_SAFETY_RULES = [
  "Keine Zahlung in der App.",
  "Keine Adresse im Inserat oder Chat teilen.",
  "Übergabe nur im Quartier und an sicheren Treffpunkten.",
  "Problem melden, wenn etwas komisch wirkt.",
] as const;

export function isYouthExchangeType(
  value: string | null | undefined,
): value is YouthExchangeType {
  return YOUTH_EXCHANGE_TYPES.some((type) => type.id === value);
}

export function youthExchangeAllowsMoney(): boolean {
  return false;
}
