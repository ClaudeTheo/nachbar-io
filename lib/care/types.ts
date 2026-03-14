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

export type CareAppointmentType = 'doctor' | 'care_service' | 'therapy' | 'other';

export type CareHelperRole = 'neighbor' | 'relative' | 'care_service';
export type CareHelperVerification = 'pending' | 'verified' | 'revoked';

export type CareAuditEventType =
  | 'sos_triggered' | 'sos_accepted' | 'sos_resolved' | 'sos_escalated' | 'sos_cancelled'
  | 'checkin_ok' | 'checkin_not_well' | 'checkin_missed' | 'checkin_escalated'
  | 'medication_taken' | 'medication_skipped' | 'medication_missed' | 'medication_snoozed'
  | 'appointment_confirmed' | 'appointment_missed'
  | 'visit_logged' | 'helper_registered' | 'helper_verified'
  | 'document_generated' | 'profile_updated' | 'subscription_changed';

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
  | 'care_escalation' | 'care_helper_verified';

// === Interfaces ===

export interface EmergencyContact {
  name: string;
  phone_encrypted: string;
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
