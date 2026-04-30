export type FeatureFlagPresetPhase =
  | "phase_0"
  | "phase_1"
  | "phase_2"
  | "phase_2a"
  | "phase_2b"
  | "phase_2c"
  | "phase_2d"
  | "phase_2e";

export const PHASE_1_ON_FLAGS = [
  "PILOT_MODE",
  "NINA_WARNINGS_ENABLED",
  "DWD_WEATHER_WARNINGS_ENABLED",
  "UBA_AIR_QUALITY_ENABLED",
  "LGL_BW_BUILDING_OUTLINES_ENABLED",
  "OSM_POI_LAYER_ENABLED",
  "DELFI_OEPNV_ENABLED",
  "BKG_GEOCODER_FALLBACK_ENABLED",
  "AI_PROVIDER_OFF",
  "CARE_ACCESS_FAMILY",
  "CARE_ACCESS_EMERGENCY",
] as const;

export const PHASE_1_OFF_FLAGS = [
  "AI_PROVIDER_CLAUDE",
  "AI_PROVIDER_MISTRAL",
  "MEDICATIONS_ENABLED",
  "DOCTORS_ENABLED",
  "APPOINTMENTS_ENABLED",
  "VIDEO_CONSULTATION",
  "HEARTBEAT_ENABLED",
  "GDT_ENABLED",
  "CARE_MODULE",
  "CARE_ACCESS_INDIVIDUAL_CAREGIVER",
  "CARE_ACCESS_CARE_COMPANY",
  "MARKETPLACE",
  "EVENTS",
  "BOARD_ENABLED",
  "LOST_FOUND",
  "KOMMUNAL_MODULE",
  "MODERATION_ENABLED",
  "ORG_DASHBOARD",
  "QUARTER_STATS",
  "PUSH_NOTIFICATIONS",
  "NEWS_AI",
  "VIDEO_CALL_PLUS",
  "VIDEO_CALL_MEDICAL",
  "BILLING_ENABLED",
  "TWILIO_ENABLED",
  "CHECKIN_MESSAGES_ENABLED",
  "BFARM_DRUGS_ENABLED",
  "DIGA_REGISTRY_ENABLED",
  "GKV_CARE_REGISTRY_ENABLED",
  "REFERRAL_REWARDS",
  "QUARTER_PROGRESS",
  "HANDWERKER",
  "BUSINESSES",
  "INVITATIONS",
] as const;

export const KNOWN_FEATURE_FLAGS = [
  ...PHASE_1_ON_FLAGS,
  ...PHASE_1_OFF_FLAGS,
] as const;

export const PHASE_0_PRESET: Record<string, boolean> =
  Object.fromEntries(KNOWN_FEATURE_FLAGS.map((flag) => [flag, true]));

export const PHASE_1_PRESET: Record<string, boolean> = {
  ...Object.fromEntries(PHASE_1_ON_FLAGS.map((flag) => [flag, true])),
  ...Object.fromEntries(PHASE_1_OFF_FLAGS.map((flag) => [flag, false])),
};

// Phase 2a: sofort nach HR-Eintragung, ohne Provider-AVV.
export const PHASE_2A_AFTER_HR_FLAGS = [
  "BILLING_ENABLED",
  "DOCTORS_ENABLED",
  "BOARD_ENABLED",
  "EVENTS",
  "MARKETPLACE",
  "LOST_FOUND",
  "PUSH_NOTIFICATIONS",
  "QUARTER_PROGRESS",
  "INVITATIONS",
  "BUSINESSES",
  "REFERRAL_REWARDS",
] as const;

// Phase 2b: nach KI-AVV mit genau einem gewaehlten Provider.
export const PHASE_2B_AFTER_AI_AVV_FLAGS = [
  "AI_PROVIDER_CLAUDE",
  "NEWS_AI",
] as const;

// Phase 2c: nach Twilio-AVV.
export const PHASE_2C_AFTER_TWILIO_AVV_FLAGS = ["TWILIO_ENABLED"] as const;

// Phase 2d: nach Care-AVV plus DSFA fuer sensitive Care-Daten.
export const PHASE_2D_AFTER_CARE_AVV_FLAGS = [
  "CARE_MODULE",
  "MEDICATIONS_ENABLED",
  "CHECKIN_MESSAGES_ENABLED",
  "HEARTBEAT_ENABLED",
  "CARE_ACCESS_INDIVIDUAL_CAREGIVER",
  "CARE_ACCESS_CARE_COMPANY",
] as const;

// Phase 2e: nach Vertrag mit Sprechstunde.online und ggf. Arzt-Praxen.
export const PHASE_2E_AFTER_DOCTOR_CONTRACT_FLAGS = [
  "APPOINTMENTS_ENABLED",
  "VIDEO_CONSULTATION",
  "GDT_ENABLED",
  "VIDEO_CALL_PLUS",
  "VIDEO_CALL_MEDICAL",
] as const;

// Bleibt auch in Phase 2 gesperrt, bis eigene Verträge/Pruefungen vorliegen.
export const PHASE_2_OFF_FLAGS = [
  "MODERATION_ENABLED",
  "ORG_DASHBOARD",
  "QUARTER_STATS",
  "KOMMUNAL_MODULE",
  "HANDWERKER",
  "BFARM_DRUGS_ENABLED",
  "DIGA_REGISTRY_ENABLED",
  "GKV_CARE_REGISTRY_ENABLED",
] as const;

export const PHASE_2A_PRESET: Record<string, boolean> = Object.fromEntries(
  PHASE_2A_AFTER_HR_FLAGS.map((flag) => [flag, true]),
);

export const PHASE_2B_PRESET: Record<string, boolean> = Object.fromEntries(
  PHASE_2B_AFTER_AI_AVV_FLAGS.map((flag) => [flag, true]),
);

export const PHASE_2C_PRESET: Record<string, boolean> = Object.fromEntries(
  PHASE_2C_AFTER_TWILIO_AVV_FLAGS.map((flag) => [flag, true]),
);

export const PHASE_2D_PRESET: Record<string, boolean> = Object.fromEntries(
  PHASE_2D_AFTER_CARE_AVV_FLAGS.map((flag) => [flag, true]),
);

export const PHASE_2E_PRESET: Record<string, boolean> = Object.fromEntries(
  PHASE_2E_AFTER_DOCTOR_CONTRACT_FLAGS.map((flag) => [flag, true]),
);

export const PHASE_2_PRESET: Record<string, boolean> = {
  ...PHASE_2A_PRESET,
  ...PHASE_2B_PRESET,
  ...PHASE_2C_PRESET,
  ...PHASE_2D_PRESET,
  ...PHASE_2E_PRESET,
  ...Object.fromEntries(PHASE_2_OFF_FLAGS.map((flag) => [flag, false])),
};

export const FEATURE_FLAG_PHASE_PRESETS: Record<
  FeatureFlagPresetPhase,
  Record<string, boolean>
> = {
  phase_0: PHASE_0_PRESET,
  phase_1: PHASE_1_PRESET,
  phase_2: PHASE_2_PRESET,
  phase_2a: PHASE_2A_PRESET,
  phase_2b: PHASE_2B_PRESET,
  phase_2c: PHASE_2C_PRESET,
  phase_2d: PHASE_2D_PRESET,
  phase_2e: PHASE_2E_PRESET,
};

export const FEATURE_FLAG_PHASE_CONFIRM_WORDS: Record<
  FeatureFlagPresetPhase,
  string
> = {
  phase_0: "PHASE_0",
  phase_1: "PHASE_1",
  phase_2: "PHASE_2",
  phase_2a: "PHASE_2A",
  phase_2b: "PHASE_2B",
  phase_2c: "PHASE_2C",
  phase_2d: "PHASE_2D",
  phase_2e: "PHASE_2E",
};
