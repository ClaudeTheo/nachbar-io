// Nachbar Hilfe — Bundesland-Regeln (statische Daten, spiegelt DB-Seed)
import type { FederalStateRule } from './types';

/** Alle 4 Bundesland-Regeln (Pilotphase: BW, BY, NW verfuegbar; HB nicht) */
const FEDERAL_STATE_RULES: FederalStateRule[] = [
  {
    state_code: 'BW',
    state_name: 'Baden-Wuerttemberg',
    is_available: true,
    training_required: false,
    training_hours: null,
    min_age: 16,
    max_hourly_rate_cents: null,
    max_concurrent_clients: 2,
    relationship_exclusion_degree: 2,
    same_household_excluded: true,
    registration_authority: null,
    official_form_url: null,
    notes: 'Seit 01.01.2025: vereinfachte Einzelhelfenden-Abrechnung',
  },
  {
    state_code: 'BY',
    state_name: 'Bayern',
    is_available: true,
    training_required: false,
    training_hours: null,
    min_age: 16,
    max_hourly_rate_cents: null,
    max_concurrent_clients: null,
    relationship_exclusion_degree: 2,
    same_household_excluded: true,
    registration_authority: null,
    official_form_url: null,
    notes: 'Nachbarschaftshilfe nach Art. 45a SGB XI anerkannt',
  },
  {
    state_code: 'NW',
    state_name: 'Nordrhein-Westfalen',
    is_available: true,
    training_required: true,
    training_hours: 30,
    min_age: 16,
    max_hourly_rate_cents: null,
    max_concurrent_clients: null,
    relationship_exclusion_degree: 2,
    same_household_excluded: true,
    registration_authority: null,
    official_form_url: null,
    notes: 'Pflegekurs oder 30h Schulung erforderlich',
  },
  {
    state_code: 'HB',
    state_name: 'Bremen',
    is_available: false,
    training_required: false,
    training_hours: null,
    min_age: 16,
    max_hourly_rate_cents: null,
    max_concurrent_clients: null,
    relationship_exclusion_degree: 2,
    same_household_excluded: true,
    registration_authority: null,
    official_form_url: null,
    notes: 'Nachbarschaftshilfe nicht ueber Entlastungsbetrag abrechenbar',
  },
];

/** Nur verfuegbare Bundeslaender (is_available === true) */
export function getAvailableStates(): FederalStateRule[] {
  return FEDERAL_STATE_RULES.filter((s) => s.is_available);
}

/** Alle Bundeslaender inkl. nicht-verfuegbare */
export function getAllStates(): FederalStateRule[] {
  return [...FEDERAL_STATE_RULES];
}

/** Regeln fuer ein bestimmtes Bundesland (oder null) */
export function getStateRules(stateCode: string): FederalStateRule | null {
  return FEDERAL_STATE_RULES.find((s) => s.state_code === stateCode) ?? null;
}

/** Prueft ob ein Bundesland verfuegbar ist */
export function isStateAvailable(stateCode: string): boolean {
  const state = getStateRules(stateCode);
  return state?.is_available ?? false;
}

/**
 * Prueft ob eine Person das Mindestalter fuer ein Bundesland erfuellt.
 * Exakte Berechnung anhand Jahr/Monat/Tag.
 */
export function validateHelperAge(
  stateCode: string,
  dateOfBirth: Date,
  referenceDate: Date = new Date(),
): boolean {
  const state = getStateRules(stateCode);
  if (!state) return false;

  // Exakte Altersberechnung: Jahr-Differenz, ggf. -1 wenn Geburtstag noch nicht war
  let age = referenceDate.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = referenceDate.getMonth() - dateOfBirth.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && referenceDate.getDate() < dateOfBirth.getDate())
  ) {
    age--;
  }

  return age >= state.min_age;
}

/**
 * Prueft ob ein Stundensatz innerhalb des Bundesland-Limits liegt.
 * Gibt true zurueck wenn kein Limit existiert (null = unbegrenzt).
 */
export function validateHourlyRate(
  stateCode: string,
  rateCents: number,
): boolean {
  const state = getStateRules(stateCode);
  if (!state) return false;

  // Kein Limit = jeder Betrag erlaubt
  if (state.max_hourly_rate_cents === null) return true;

  return rateCents <= state.max_hourly_rate_cents;
}

/** Maximale gleichzeitige Klienten fuer ein Bundesland (oder null = unbegrenzt) */
export function getMaxClients(stateCode: string): number | null {
  const state = getStateRules(stateCode);
  return state?.max_concurrent_clients ?? null;
}
