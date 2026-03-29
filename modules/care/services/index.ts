// modules/care/services/index.ts — Barrel Export fuer Care-Services
// Sammelt: Types, API-Helpers, Audit, Billing, Consent, Constants, Cron, Crypto,
// Escalation, Field-Encryption, Health, Logger, Notifications, Permissions, Voice-Classify

// Typen (alle aus types.ts)
export type {
  CareLevel,
  CareSosCategory,
  CareSosStatus,
  CareSosSource,
  CareSosResponseType,
  CareCheckinStatus,
  CareCheckinMood,
  CareMedicationLogStatus,
  CareAppointmentType,
  CareAppointmentVisibility,
  CareHelperRole,
  CareHelperVerification,
  CareAuditEventType,
  CareDocumentType,
  CareSubscriptionPlan,
  CareSubscriptionStatus,
  CareNotificationType,
  EmergencyContact,
  EscalationConfig,
  MedicationSchedule,
  CareProfile,
  CareSosAlert,
  CareSosResponse,
  CareCheckin,
  CareMedication,
  CareMedicationLog,
  CareAppointment,
  CareHelper,
  CareAuditEntry,
  CareDocument,
  CareSubscription,
  CareUserRole,
  ConsultationProviderType,
  ConsultationStatus,
  ConsultationSlot,
  ConsultationConsent,
  HeartbeatSource,
  HeartbeatDeviceType,
  CaregiverRelationshipType,
  EscalationStage,
  ResidentStatus,
  Heartbeat,
  CaregiverInvite,
  CaregiverLink,
  EscalationEvent,
  GateCode,
  CareConsentFeature,
  CareConsent,
  CareConsentHistory,
} from "./types";
export { CONSENT_FEATURES, CONSENT_DEPENDENCIES } from "./types";

// API-Helpers
export {
  errorResponse,
  successResponse,
  requireAuth,
  requireFeature,
  requireAdmin,
  requireCareAccess,
  careLog,
  careError,
  featureGateResponse,
  requireSubscription,
  requireOrgAccess,
  requireDoctorAccess,
  unauthorizedResponse,
} from "./api-helpers";

// Audit
export { writeAuditLog } from "./audit";

// Billing
export {
  PLAN_HIERARCHY,
  PLAN_METADATA,
  FEATURE_LABELS,
  canUpgrade,
  isTrialExpired,
  trialDaysRemaining,
  getUpgradeFeatures,
  minimumPlanForFeature,
} from "./billing";

// Consent
export {
  CONSENT_FEATURE_TO_API_ROUTES,
  checkCareConsent,
  getConsentsForUser,
  hasAnyCareConsent,
} from "./consent";

// Constants
export {
  CARE_SOS_CATEGORIES,
  DEFAULT_ESCALATION_CONFIG,
  ESCALATION_LEVELS,
  CHECKIN_DEFAULTS,
  MEDICATION_DEFAULTS,
  CARE_HELPER_ROLES,
  AUDIT_EVENT_LABELS,
  PLAN_FEATURES,
  hasFeature,
  CAREGIVER_RELATIONSHIP_TYPES,
  HEARTBEAT_ESCALATION,
  MAX_CAREGIVERS_PER_RESIDENT,
  INVITE_CODE_LENGTH,
  INVITE_CODE_EXPIRY_HOURS,
  HEARTBEAT_RETENTION_DAYS,
  CARE_CONSENT_FEATURES,
  CARE_CONSENT_LABELS,
  CARE_CONSENT_DESCRIPTIONS,
  CURRENT_CONSENT_VERSION,
} from "./constants";

// Cron-Heartbeat
export type { CronJobId } from "./cron-heartbeat";
export {
  CRON_JOBS,
  writeCronHeartbeat,
  checkCronHealth,
} from "./cron-heartbeat";

// Crypto
export { encrypt, decrypt } from "./crypto";

// Escalation
export {
  shouldEscalate,
  getNextEscalationLevel,
  getEscalationMeta,
  minutesUntilEscalation,
} from "./escalation";

// Field-Encryption
export {
  isEncrypted,
  encryptField,
  decryptField,
  CARE_PROFILES_ENCRYPTED_FIELDS,
  CARE_MEDICATIONS_ENCRYPTED_FIELDS,
  CARE_CHECKINS_ENCRYPTED_FIELDS,
  CARE_SOS_ALERTS_ENCRYPTED_FIELDS,
  CARE_SOS_RESPONSES_ENCRYPTED_FIELDS,
  CARE_APPOINTMENTS_ENCRYPTED_FIELDS,
  encryptFields,
  decryptFields,
  decryptFieldsArray,
} from "./field-encryption";

// Health
export type { HealthCheck } from "./health";
export { runCareHealthChecks } from "./health";

// Logger
export { createCareLogger } from "./logger";

// Notifications
export type { NotificationResult } from "./notifications";
export { sendCareNotification } from "./notifications";

// Permissions
export { getCareRole, canAccessFeature } from "./permissions";

// Profile (Care)
export { getCareProfile, updateCareProfile } from "./profile.service";

// Checkin (erweitert)
export type { CheckinStatusResponse } from "./checkin.service";
export {
  submitCheckin,
  getCheckinHistory,
  getTodayCheckinStatus,
} from "./checkin.service";

// Consent-Routes (Art. 9)
export {
  getConsents,
  updateConsents,
  revokeConsent,
} from "./consent-routes.service";

// Voice-Classify
export type { ClassifyResult } from "./voice-classify";
export { classifyTaskFromVoice, parseClassifyResponse } from "./voice-classify";

// Channels (Sub-Module)
export { sendPush } from "./channels/push";
export { sendSms } from "./channels/sms";
export { initiateCall } from "./channels/voice";

// Reports (Sub-Module)
export type { ReportData, ReportMedicationEntry } from "./reports/types";
export { generateReportData } from "./reports/generator";
