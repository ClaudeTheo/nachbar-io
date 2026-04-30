export type FeatureFlagPresetPhase = "phase_0" | "phase_1" | "phase_2";

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

export const PHASE_2_PRESET: Record<string, boolean> = {};

export const FEATURE_FLAG_PHASE_PRESETS: Record<
  FeatureFlagPresetPhase,
  Record<string, boolean>
> = {
  phase_0: PHASE_0_PRESET,
  phase_1: PHASE_1_PRESET,
  phase_2: PHASE_2_PRESET,
};

export const FEATURE_FLAG_PHASE_CONFIRM_WORDS: Record<
  FeatureFlagPresetPhase,
  string
> = {
  phase_0: "PHASE_0",
  phase_1: "PHASE_1",
  phase_2: "PHASE_2",
};
