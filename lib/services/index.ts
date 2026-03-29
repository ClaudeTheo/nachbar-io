// Nachbar.io — Service Layer (Barrel-Export)
// Zentraler Import-Punkt fuer alle Service-Funktionen.
// Verwendung: import { getProfile, getAlertsByQuarter } from "@/lib/services"

export {
  getProfile,
  updateProfile,
  toggleUiMode,
  updateUserSettings,
  getProfileServer,
  updateProfileServer,
} from "./profile.service";

export {
  getAlertsByQuarter,
  getAlertById,
  createAlert,
  respondToAlert,
  updateAlertStatus,
  getAlertsByQuarterServer,
  createAlertServer,
} from "./alerts.service";

export type { CreateAlertParams } from "./alerts.service";

export {
  getHousehold,
  getHouseholdForUser,
  getMembership,
  getHouseholdMembers,
  getHouseholdsByQuarter,
  getHouseholdServer,
  getHouseholdForUserServer,
  getHouseholdMembersServer,
} from "./household.service";

export { completeRegistration } from "./registration.service";
export type {
  RegistrationInput,
  RegistrationResult,
} from "./registration.service";
