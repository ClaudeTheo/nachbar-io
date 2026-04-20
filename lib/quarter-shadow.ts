/**
 * Schatten-Quartier "Offenes Quartier Deutschland" fuer Free-first-Onboarding.
 * Bewohner ohne echte Quartier-Wahl werden diesem Pseudo-Quartier zugeordnet,
 * die UI maskiert es als "Ohne Quartier".
 *
 * Seed in Migration 175 (`supabase/migrations/175_housing_foundation.sql`).
 * Fixe UUID, darf sich niemals aendern.
 */

/** UUID des Schatten-Quartiers. Identisch zum Seed in Mig 175. */
export const SHADOW_QUARTER_ID = "00000000-0000-0000-0000-000000000001";

/** Prueft, ob eine Quarter-UUID das Schatten-Quartier ist. */
export function isShadowQuarter(quarterId: string | null | undefined): boolean {
  return quarterId === SHADOW_QUARTER_ID;
}

/**
 * Liefert einen fuer den Nutzer lesbaren Quartiernamen.
 * Maskiert das Schatten-Quartier als "Ohne Quartier", sonst der echte Name.
 */
export function quarterDisplayName(
  quarterId: string | null | undefined,
  realName: string,
): string {
  return isShadowQuarter(quarterId) ? "Ohne Quartier" : realName;
}

/**
 * Liefert die Quarter-UUID, die beim Registration-Abschluss gesetzt werden soll.
 * Gibt das Schatten-Quartier zurueck, wenn kein echtes Quartier gewaehlt wurde.
 */
export function resolveQuarterIdOrShadow(
  chosenQuarterId: string | null | undefined,
): string {
  return chosenQuarterId ?? SHADOW_QUARTER_ID;
}
