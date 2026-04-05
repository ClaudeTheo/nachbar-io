// Gamification-Modul: Nachbarschaftspunkte + Abzeichen
export {
  awardPoints,
  getPointsInfo,
  getPointsLog,
  calculateLevel,
} from "./services/points.service";
export type { AwardResult } from "./services/points.service";
export {
  POINTS_CONFIG,
  LEVEL_THRESHOLDS,
  ONE_TIME_ACTIONS,
  ACTION_LABELS,
} from "./services/constants";
export {
  checkAndAwardBadges,
  getUserBadges,
  BADGE_DEFINITIONS,
} from "./services/badges.service";
