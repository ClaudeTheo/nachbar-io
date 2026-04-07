// lib/care/types.ts
// Nachbar.io — Pflege-Modul Typen

// === Enums ===

export type CareLevel = 'none' | '1' | '2' | '3' | '4' | '5';

export type CareSosCategory =
  | 'medical_emergency'
  | 'general_help'
  | 'visit_wanted'
  | 'shopping'
  | 'medication_help';

export type CareSosStatus =
  | 'triggered'
  | 'notified'
  | 'accepted'
  | 'helper_enroute'
  | 'resolved'
  | 'cancelled'
  | 'escalated';

export type CareSosSource = 'app' | 'device' | 'checkin_timeout';

export type CareSosResponseType = 'accepted' | 'declined' | 'arrived' | 'completed';

export type CareCheckinStatus = 'ok' | 'not_well' | 'need_help' | 'missed' | 'reminded';
export type CareCheckinMood = 'good' | 'neutral' | 'bad';

export type CareMedicationLogStatus = 'taken' | 'skipped' | 'snoozed' | 'missed';

export type CareAppointmentType =
  | 'doctor' | 'care_service' | 'therapy' | 'other'
  | 'waste_collection' | 'quarter_meeting' | 'shopping' | 'personal' | 'birthday';

export type CareAppointmentVisibility = 'private' | 'helpers' | 'quarter';

export type CareHelperRole = 'neighbor' | 'relative' | 'care_service';
export type CareHelperVerification = 'pending' | 'verified' | 'revoked';

export type CareAuditEventType =
  | 'sos_triggered' | 'sos_accepted' | 'sos_resolved' | 'sos_escalated' | 'sos_cancelled'
  | 'checkin_ok' | 'checkin_not_well' | 'checkin_missed' | 'checkin_escalated'
  | 'medication_taken' | 'medication_skipped' | 'medication_missed' | 'medication_snoozed'
  | 'appointment_confirmed' | 'appointment_missed'
  | 'visit_logged' | 'helper_registered' | 'helper_verified'
  | 'task_created' | 'task_claimed' | 'task_unclaimed' | 'task_started'
  | 'task_completed' | 'task_confirmed' | 'task_cancelled' | 'task_deleted'
  | 'document_generated' | 'profile_updated' | 'subscription_changed'
  | 'caregiver_invited' | 'caregiver_linked' | 'caregiver_revoked'
  | 'heartbeat_toggle' | 'escalation_triggered' | 'escalation_resolved'
  | 'consent_updated' | 'consent_revoked';

export type CareDocumentType =
  | 'care_report_daily' | 'care_report_weekly' | 'care_report_monthly'
  | 'emergency_log' | 'medication_report' | 'care_aid_application'
  | 'tax_summary' | 'usage_report';

export type CareSubscriptionPlan = 'free' | 'plus' | 'pro';
export type CareSubscriptionStatus = 'active' | 'trial' | 'cancelled' | 'expired';

export type CareNotificationType =
  | 'care_sos' | 'care_sos_response' | 'care_checkin_reminder'
  | 'care_checkin_missed' | 'care_medication_reminder'
  | 'care_medication_missed' | 'care_appointment_reminder'
  | 'care_escalation' | 'care_helper_verified'
  | 'care_task_claimed' | 'care_task_completed'
  | 'care_heartbeat_reminder' | 'care_heartbeat_alert';

// === Interfaces ===

export interface EmergencyContact {
  name: string;
  /** Telefonnummer — wird serverseitig per AES-256-GCM verschluesselt (DSGVO Art. 9) */
  phone: string;
  role: 'relative' | 'care_service' | 'neighbor' | 'other';
  priority: number;
  relationship: string;
}

export interface EscalationConfig {
  escalate_to_level_2_after_minutes: number;
  escalate_to_level_3_after_minutes: number;
  escalate_to_level_4_after_minutes: number;
}

export interface MedicationSchedule {
  type: 'daily' | 'weekly' | 'interval';
  times?: string[];
  days?: string[];
  time?: string;
  every_hours?: number;
}

export interface CareProfile {
  id: string;
  user_id: string;
  care_level: CareLevel;
  emergency_contacts: EmergencyContact[];
  medical_notes: string | null;
  preferred_hospital: string | null;
  insurance_number: string | null;
  checkin_times: string[];
  checkin_enabled: boolean;
  escalation_config: EscalationConfig;
  created_at: string;
  updated_at: string;
}

export interface CareSosAlert {
  id: string;
  senior_id: string;
  category: CareSosCategory;
  status: CareSosStatus;
  current_escalation_level: number;
  escalated_at: string[];
  accepted_by: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  notes: string | null;
  source: CareSosSource;
  created_at: string;
  // Joined
  responses?: CareSosResponse[];
  senior?: { display_name: string; avatar_url: string | null };
}

export interface CareSosResponse {
  id: string;
  sos_alert_id: string;
  helper_id: string;
  response_type: CareSosResponseType;
  eta_minutes: number | null;
  note: string | null;
  created_at: string;
  helper?: { display_name: string; avatar_url: string | null };
}

export interface CareCheckin {
  id: string;
  senior_id: string;
  status: CareCheckinStatus;
  mood: CareCheckinMood | null;
  note: string | null;
  scheduled_at: string;
  completed_at: string | null;
  reminder_sent_at: string | null;
  escalated: boolean;
  created_at: string;
}

export interface CareMedication {
  id: string;
  senior_id: string;
  name: string;
  dosage: string | null;
  schedule: MedicationSchedule;
  instructions: string | null;
  managed_by: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CareMedicationLog {
  id: string;
  medication_id: string;
  senior_id: string;
  scheduled_at: string;
  status: CareMedicationLogStatus;
  confirmed_at: string | null;
  snoozed_until: string | null;
  created_at: string;
  medication?: Pick<CareMedication, 'name' | 'dosage'>;
}

export interface CareAppointment {
  id: string;
  senior_id: string;
  title: string;
  type: CareAppointmentType;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  reminder_minutes_before: number[];
  recurrence: Record<string, unknown> | null;
  managed_by: string | null;
  notes: string | null;
  visibility?: CareAppointmentVisibility;
  created_at: string;
  updated_at: string;
}

export interface CareHelper {
  id: string;
  user_id: string;
  role: CareHelperRole;
  verification_status: CareHelperVerification;
  verified_by: string | null;
  assigned_seniors: string[];
  availability: Record<string, unknown> | null;
  skills: string[];
  response_count: number;
  avg_response_minutes: number | null;
  created_at: string;
  updated_at: string;
  // Joined
  user?: { display_name: string; avatar_url: string | null };
}

export interface CareAuditEntry {
  id: string;
  senior_id: string;
  actor_id: string;
  event_type: CareAuditEventType;
  reference_type: string | null;
  reference_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: { display_name: string };
}

export interface CareDocument {
  id: string;
  senior_id: string;
  type: CareDocumentType;
  title: string;
  period_start: string | null;
  period_end: string | null;
  generated_by: string;
  storage_path: string;
  file_size_bytes: number | null;
  created_at: string;
}

export interface CareSubscription {
  id: string;
  user_id: string;
  plan: CareSubscriptionPlan;
  status: CareSubscriptionStatus;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  payment_provider: string | null;
  external_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

// === Aktive Rolle des eingeloggten Users im Care-Kontext ===
export type CareUserRole = 'senior' | CareHelperRole | 'admin' | 'none';

// === Online-Sprechstunde ===

export type ConsultationProviderType = 'community' | 'medical';

export type ConsultationStatus =
  | 'scheduled'
  | 'waiting'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'proposed'
  | 'counter_proposed'
  | 'confirmed'
  | 'declined';

export interface ConsultationSlot {
  id: string;
  quarter_id: string;
  provider_type: ConsultationProviderType;
  host_user_id: string | null;
  host_name: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  status: ConsultationStatus;
  booked_by: string | null;
  booked_at: string | null;
  room_id: string | null;
  join_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Verhandlungsfelder (Migration 076, optional fuer Abwaertskompatibilitaet)
  proposed_by?: string | null;
  counter_proposed_at?: string | null;
  previous_scheduled_at?: string | null;
  status_changed_at?: string | null;
  cancelled_by?: string | null;
  doctor_id?: string | null;
}

export interface ConsultationConsent {
  id: string;
  user_id: string;
  consent_version: string;
  consented_at: string;
  provider_type: ConsultationProviderType;
}

// === Heartbeat + Caregiver (Plus-Features) ===

export type HeartbeatSource = 'app' | 'kiosk' | 'web' | 'synthetic';
export type HeartbeatDeviceType = 'mobile' | 'tablet' | 'kiosk' | 'desktop';

export type CaregiverRelationshipType =
  | 'partner' | 'child' | 'grandchild' | 'friend' | 'volunteer' | 'other';

export type EscalationStage =
  | 'reminder_4h' | 'alert_8h' | 'lotse_12h' | 'urgent_24h';

export type ResidentStatus = 'ok' | 'warning' | 'missing' | 'critical';

export interface Heartbeat {
  id: string;
  user_id: string;
  source: HeartbeatSource;
  device_type: HeartbeatDeviceType | null;
  created_at: string;
}

export interface CaregiverInvite {
  id: string;
  resident_id: string;
  invite_code: string;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  created_at: string;
}

export interface CaregiverLink {
  id: string;
  resident_id: string;
  caregiver_id: string;
  relationship_type: CaregiverRelationshipType;
  heartbeat_visible: boolean;
  created_at: string;
  revoked_at: string | null;
  // Joined
  resident?: { display_name: string; avatar_url: string | null };
  caregiver?: { display_name: string; avatar_url: string | null };
}

export interface EscalationEvent {
  id: string;
  resident_id: string;
  stage: EscalationStage;
  triggered_at: string;
  resolved_at: string | null;
  notified_users: string[];
}

// === Feature-Gate Response Codes ===
export type GateCode = 'PLAN_REQUIRED' | 'ROLE_REQUIRED' | 'TENANT_ACCESS_REQUIRED';

// === Art. 9 Einwilligungsmanagement (DSFA M12) ===

export const CONSENT_FEATURES = ['sos', 'checkin', 'medications', 'care_profile', 'emergency_contacts'] as const;
export type CareConsentFeature = (typeof CONSENT_FEATURES)[number];

export interface CareConsent {
  id: string;
  user_id: string;
  feature: CareConsentFeature;
  granted: boolean;
  consent_version: string;
  granted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CareConsentHistory {
  id: string;
  consent_id: string;
  user_id: string;
  feature: CareConsentFeature;
  action: 'granted' | 'revoked';
  consent_version: string;
  created_at: string;
}

// Abhaengigkeitsregel: emergency_contacts erfordert sos
export const CONSENT_DEPENDENCIES: Partial<Record<CareConsentFeature, CareConsentFeature>> = {
  emergency_contacts: 'sos',
};
