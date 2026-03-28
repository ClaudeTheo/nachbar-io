// Barrel Export: Jugend-Modul
// Alle oeffentlichen Exporte fuer @/lib/youth

// Badges
export type { BadgeCondition, UserStats } from "./badges";
export { checkBadgeEligibility } from "./badges";

// Elternfreigabe
export {
  generateConsentToken,
  hashToken,
  isTokenExpired,
  CONSENT_TEXT_VERSION,
  TOKEN_EXPIRY_HOURS,
} from "./consent";

// React Hooks
export type { YouthProfileData } from "./hooks";
export { useYouthProfile } from "./hooks";

// Chat-Moderation
export type { ModerationResult } from "./moderation";
export { filterMessage, containsContactInfo } from "./moderation";

// Punkte
export { calculateTaskReward } from "./points";

// Profil
export type { AgeGroup, AccessLevel, YouthFeature } from "./profile";
export {
  YOUTH_FEATURES,
  calculateAgeGroup,
  getAccessLevel,
  canAccessFeature,
} from "./profile";
