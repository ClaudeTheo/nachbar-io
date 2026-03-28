// modules/youth/index.ts
// Barrel Export: Jugend-Modul
// Alle oeffentlichen Exporte fuer @/modules/youth

// Badges
export type { BadgeCondition, UserStats } from "./services/badges";
export { checkBadgeEligibility } from "./services/badges";

// Elternfreigabe
export {
  generateConsentToken,
  hashToken,
  isTokenExpired,
  CONSENT_TEXT_VERSION,
  TOKEN_EXPIRY_HOURS,
  MAX_TOKEN_SENDS,
} from "./services/consent";

// React Hooks
export type { YouthProfileData } from "./services/hooks";
export { useYouthProfile } from "./services/hooks";

// Chat-Moderation
export type { ModerationResult } from "./services/moderation";
export { filterMessage, containsContactInfo } from "./services/moderation";

// Punkte
export { calculateTaskReward } from "./services/points";

// Profil
export type { AgeGroup, AccessLevel, YouthFeature } from "./services/profile";
export {
  YOUTH_FEATURES,
  calculateAgeGroup,
  getAccessLevel,
  canAccessFeature,
} from "./services/profile";

// Komponenten
export { AccessLevelBanner } from "./components/AccessLevelBanner";
export { BadgeCard } from "./components/BadgeCard";
export { PointsDisplay } from "./components/PointsDisplay";
export { TaskBoard } from "./components/TaskBoard";
export { TaskCard } from "./components/TaskCard";
export { YouthGuard } from "./components/YouthGuard";
