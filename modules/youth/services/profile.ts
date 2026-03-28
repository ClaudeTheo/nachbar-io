// modules/youth/services/profile.ts
// Jugend-Modul: Profil-Logik, Altersgruppen, Zugangs-Stufen

export type AgeGroup = 'u16' | '16_17';
export type AccessLevel = 'basis' | 'erweitert' | 'freigeschaltet';

// Feature-Berechtigung nach Stufe
export const YOUTH_FEATURES = {
  // Basis (alle 14-17, sofort)
  view_tasks: 'basis',
  view_challenges: 'basis',
  view_board: 'basis',
  view_map: 'basis',
  collect_points: 'basis',
  earn_badges: 'basis',
  // Erweitert (ab 16 oder Elternfreigabe)
  accept_task: 'erweitert',
  chat: 'erweitert',
  public_profile: 'erweitert',
  join_events: 'erweitert',
  write_board: 'erweitert',
  // Freigeschaltet (Elternfreigabe erteilt)
  certificates: 'freigeschaltet',
  org_connection: 'freigeschaltet',
  mentoring: 'freigeschaltet',
  engagement_export: 'freigeschaltet',
} as const;

export type YouthFeature = keyof typeof YOUTH_FEATURES;

const LEVEL_HIERARCHY: Record<AccessLevel, number> = {
  basis: 0,
  erweitert: 1,
  freigeschaltet: 2,
};

/**
 * Berechnet die Altersgruppe basierend auf Geburtsjahr.
 * Gibt null zurueck wenn ausserhalb 14-17.
 */
export function calculateAgeGroup(
  birthYear: number,
  currentYear: number = new Date().getFullYear()
): AgeGroup | null {
  const age = currentYear - birthYear;
  if (age >= 14 && age <= 15) return 'u16';
  if (age >= 16 && age <= 17) return '16_17';
  return null;
}

/**
 * Bestimmt die Zugangs-Stufe basierend auf Alter und Elternfreigabe.
 */
export function getAccessLevel(
  ageGroup: AgeGroup,
  hasGuardianConsent: boolean
): AccessLevel {
  if (hasGuardianConsent) return 'freigeschaltet';
  if (ageGroup === '16_17') return 'erweitert';
  return 'basis';
}

/**
 * Prueft ob eine bestimmte Funktion fuer die Zugangs-Stufe erlaubt ist.
 */
export function canAccessFeature(
  level: AccessLevel,
  feature: YouthFeature
): boolean {
  const requiredLevel = YOUTH_FEATURES[feature];
  if (!requiredLevel) return false;
  return LEVEL_HIERARCHY[level] >= LEVEL_HIERARCHY[requiredLevel as AccessLevel];
}
