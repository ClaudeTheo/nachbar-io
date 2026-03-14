// lib/care/constants.ts
// Nachbar.io — Pflege-Modul Konstanten

import type { CareSosCategory, CareHelperRole, CareAuditEventType, CareSubscriptionPlan } from './types';

// SOS-Kategorien mit UI-Metadaten
export const CARE_SOS_CATEGORIES: Array<{
  id: CareSosCategory;
  label: string;
  icon: string;
  isEmergency: boolean;
  description: string;
}> = [
  { id: 'medical_emergency', label: 'Medizinischer Notfall', icon: '🚑', isEmergency: true, description: 'Sofort 112 anrufen' },
  { id: 'general_help', label: 'Allgemeine Hilfe', icon: '🤝', isEmergency: false, description: 'Ich brauche Unterstuetzung' },
  { id: 'visit_wanted', label: 'Besuch gewuenscht', icon: '👋', isEmergency: false, description: 'Ich moechte Gesellschaft' },
  { id: 'shopping', label: 'Einkauf / Besorgung', icon: '🛒', isEmergency: false, description: 'Ich brauche etwas aus dem Laden' },
  { id: 'medication_help', label: 'Medikamentenhilfe', icon: '💊', isEmergency: false, description: 'Hilfe mit meinen Medikamenten' },
] as const;

// Eskalations-Defaults
export const DEFAULT_ESCALATION_CONFIG = {
  escalate_to_level_2_after_minutes: 5,
  escalate_to_level_3_after_minutes: 15,
  escalate_to_level_4_after_minutes: 30,
} as const;

// Eskalationsstufen-Metadaten
export const ESCALATION_LEVELS = [
  { level: 1, label: 'Nachbarn', role: 'neighbor' as CareHelperRole, channels: ['push', 'in_app'] },
  { level: 2, label: 'Angehoerige', role: 'relative' as CareHelperRole, channels: ['push', 'in_app', 'sms'] },
  { level: 3, label: 'Pflegedienst', role: 'care_service' as CareHelperRole, channels: ['push', 'in_app', 'sms', 'voice'] },
  { level: 4, label: 'Leitstelle / Externe', role: null, channels: ['sms', 'voice', 'admin_alert'] },
] as const;

// Check-in Konfiguration
export const CHECKIN_DEFAULTS = {
  reminderAfterMinutes: 30,
  escalateAfterMinutes: 60,
  defaultTimes: ['08:00', '20:00'],
} as const;

// Medikamenten-Erinnerung
export const MEDICATION_DEFAULTS = {
  snoozeMinutes: 30,
  missedAfterMinutes: 60,
} as const;

// Helfer-Rollen mit UI-Metadaten
export const CARE_HELPER_ROLES: Array<{
  id: CareHelperRole;
  label: string;
  description: string;
}> = [
  { id: 'neighbor', label: 'Nachbar', description: 'Freiwilliger Helfer aus der Nachbarschaft' },
  { id: 'relative', label: 'Angehoerige/r', description: 'Familienangehoeriger des Seniors' },
  { id: 'care_service', label: 'Pflegedienst', description: 'Professioneller Pflegedienstleister' },
] as const;

// Audit-Event-Labels (fuer UI)
export const AUDIT_EVENT_LABELS: Record<CareAuditEventType, string> = {
  sos_triggered: 'SOS ausgeloest',
  sos_accepted: 'SOS angenommen',
  sos_resolved: 'SOS geschlossen',
  sos_escalated: 'SOS eskaliert',
  sos_cancelled: 'SOS abgebrochen',
  checkin_ok: 'Check-in: Mir geht es gut',
  checkin_not_well: 'Check-in: Nicht so gut',
  checkin_missed: 'Check-in verpasst',
  checkin_escalated: 'Check-in eskaliert',
  medication_taken: 'Medikament genommen',
  medication_skipped: 'Medikament uebersprungen',
  medication_missed: 'Medikament verpasst',
  medication_snoozed: 'Medikament verschoben',
  appointment_confirmed: 'Termin bestaetigt',
  appointment_missed: 'Termin verpasst',
  visit_logged: 'Besuch dokumentiert',
  helper_registered: 'Helfer registriert',
  helper_verified: 'Helfer verifiziert',
  document_generated: 'Dokument erstellt',
  profile_updated: 'Profil aktualisiert',
  subscription_changed: 'Abo geaendert',
} as const;

// Subscription-Plan-Features (Feature-Gates)
// Strategie-Dokument Phase 4: Free / Plus / Pro
// PILOTPHASE: free hat alle Features freigeschaltet (fuer Tester)
// NACH PILOTPHASE: free wieder auf Basis-Features beschraenken
const FREE_FEATURES = [
  'alerts_receive', 'alerts_send', 'pinnwand_read', 'pinnwand_post',
  'profile_basic', 'help_basic', 'push_notifications', 'senior_mode',
  'checkin', 'medical_emergency_sos', 'sos_all',
] as const;

const PLUS_FEATURES = [
  ...FREE_FEATURES,
  'marketplace', 'events_create', 'help_extended',
  'group_messages', 'ai_digest', 'profile_extended', 'ad_free',
  'medications', 'appointments', 'reports',
] as const;

const PRO_FEATURES = [
  ...PLUS_FEATURES,
  'quarter_dashboard', 'bulk_invites', 'moderation_tools',
  'polls', 'sponsor_management', 'export_csv_pdf', 'priority_support',
  'multi_senior', 'care_dashboard', 'audit_log', 'relative_dashboard',
] as const;

export const PLAN_FEATURES: Record<CareSubscriptionPlan, string[]> = {
  free: [...FREE_FEATURES],
  plus: [...PLUS_FEATURES],
  pro: [...PRO_FEATURES],
} as const;

// Prueft ob ein Feature im aktuellen Plan verfuegbar ist
export function hasFeature(plan: CareSubscriptionPlan, feature: string): boolean {
  return PLAN_FEATURES[plan]?.includes(feature) ?? false;
}
