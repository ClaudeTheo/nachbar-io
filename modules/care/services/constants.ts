// lib/care/constants.ts
// Nachbar.io — Pflege-Modul Konstanten

import type {
  CareSosCategory,
  CareHelperRole,
  CareAuditEventType,
  CareSubscriptionPlan,
  CaregiverRelationshipType,
  CareConsentFeature,
} from "./types";

// SOS-Kategorien mit UI-Metadaten
export const CARE_SOS_CATEGORIES: Array<{
  id: CareSosCategory;
  label: string;
  icon: string;
  isEmergency: boolean;
  description: string;
}> = [
  {
    id: "medical_emergency",
    label: "Dringende Hilfe benötigt",
    icon: "🚑",
    isEmergency: true,
    description: "Bitte rufen Sie im Notfall 112 an",
  },
  {
    id: "general_help",
    label: "Allgemeine Hilfe",
    icon: "🤝",
    isEmergency: false,
    description: "Ich brauche Unterstuetzung",
  },
  {
    id: "visit_wanted",
    label: "Besuch gewuenscht",
    icon: "👋",
    isEmergency: false,
    description: "Ich moechte Gesellschaft",
  },
  {
    id: "shopping",
    label: "Einkauf / Besorgung",
    icon: "🛒",
    isEmergency: false,
    description: "Ich brauche etwas aus dem Laden",
  },
  {
    id: "medication_help",
    label: "Erinnerungshilfe",
    icon: "💊",
    isEmergency: false,
    description: "Hilfe mit meinen Erinnerungen",
  },
] as const;

// Eskalations-Defaults
export const DEFAULT_ESCALATION_CONFIG = {
  escalate_to_level_2_after_minutes: 5,
  escalate_to_level_3_after_minutes: 15,
  escalate_to_level_4_after_minutes: 30,
} as const;

// Eskalationsstufen-Metadaten
export const ESCALATION_LEVELS = [
  {
    level: 1,
    label: "Nachbarn",
    role: "neighbor" as CareHelperRole,
    channels: ["push", "in_app"],
  },
  {
    level: 2,
    label: "Angehoerige",
    role: "relative" as CareHelperRole,
    channels: ["push", "in_app", "sms"],
  },
  {
    level: 3,
    label: "Pflegedienst",
    role: "care_service" as CareHelperRole,
    channels: ["push", "in_app", "sms", "voice"],
  },
  {
    level: 4,
    label: "Leitstelle / Externe",
    role: null,
    channels: ["sms", "voice", "admin_alert"],
  },
] as const;

// Check-in Konfiguration
export const CHECKIN_DEFAULTS = {
  reminderAfterMinutes: 30,
  escalateAfterMinutes: 60,
  defaultTimes: ["08:00", "20:00"],
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
  {
    id: "neighbor",
    label: "Nachbar",
    description: "Freiwilliger Helfer aus der Nachbarschaft",
  },
  {
    id: "relative",
    label: "Angehoerige/r",
    description: "Familienangehoeriger des Seniors",
  },
  {
    id: "care_service",
    label: "Pflegedienst",
    description: "Professioneller Pflegedienstleister",
  },
] as const;

// Audit-Event-Labels (fuer UI)
export const AUDIT_EVENT_LABELS: Record<CareAuditEventType, string> = {
  sos_triggered: "Hilfeanfrage gesendet",
  sos_accepted: "Hilfeanfrage angenommen",
  sos_resolved: "Hilfeanfrage erledigt",
  sos_escalated: "Hilfeanfrage weitergeleitet",
  sos_cancelled: "Hilfeanfrage abgebrochen",
  checkin_ok: "Check-in: Mir geht es gut",
  checkin_not_well: "Check-in: Nicht so gut",
  checkin_missed: "Check-in verpasst",
  checkin_escalated: "Check-in eskaliert",
  medication_taken: "Erinnerung bestätigt",
  medication_skipped: "Erinnerung übersprungen",
  medication_missed: "Erinnerung verpasst",
  medication_snoozed: "Erinnerung verschoben",
  appointment_confirmed: "Termin bestaetigt",
  appointment_missed: "Termin verpasst",
  visit_logged: "Besuch dokumentiert",
  helper_registered: "Helfer registriert",
  helper_verified: "Helfer verifiziert",
  document_generated: "Dokument erstellt",
  profile_updated: "Profil aktualisiert",
  task_created: "Aufgabe erstellt",
  task_claimed: "Aufgabe uebernommen",
  task_unclaimed: "Aufgabe freigegeben",
  task_started: "Aufgabe gestartet",
  task_completed: "Aufgabe abgeschlossen",
  task_confirmed: "Aufgabe bestaetigt",
  task_cancelled: "Aufgabe abgebrochen",
  task_deleted: "Aufgabe geloescht",
  subscription_changed: "Abo geaendert",
  caregiver_invited: "Angehoeriger eingeladen",
  caregiver_linked: "Angehoeriger verknuepft",
  caregiver_revoked: "Angehoeriger entfernt",
  heartbeat_toggle: "Aktivitaetsstatus geaendert",
  escalation_triggered: "Eskalation ausgeloest",
  escalation_resolved: "Eskalation aufgeloest",
  consent_updated: "Einwilligung geändert",
  consent_revoked: "Einwilligung widerrufen",
} as const;

// Subscription-Plan-Features (Feature-Gates)
// Strategie-Dokument Phase 4: Free / Plus / Pro
// PILOTPHASE: free hat alle Features freigeschaltet (fuer Tester)
// NACH PILOTPHASE: free wieder auf Basis-Features beschraenken
const FREE_FEATURES = [
  "alerts_receive",
  "alerts_send",
  "pinnwand_read",
  "pinnwand_post",
  "profile_basic",
  "help_basic",
  "push_notifications",
  "senior_mode",
  "checkin",
  "medical_emergency_sos",
  "sos_all",
] as const;

const PLUS_FEATURES = [
  ...FREE_FEATURES,
  "marketplace",
  "events_create",
  "help_extended",
  "group_messages",
  "ai_digest",
  "profile_extended",
  "ad_free",
  "medications",
  "appointments",
  "reports",
  "caregiver_links",
  "heartbeat_sharing",
] as const;

const PRO_FEATURES = [
  ...PLUS_FEATURES,
  "quarter_dashboard",
  "bulk_invites",
  "moderation_tools",
  "polls",
  "sponsor_management",
  "export_csv_pdf",
  "priority_support",
  "multi_senior",
  "care_dashboard",
  "audit_log",
  "relative_dashboard",
] as const;

export const PLAN_FEATURES: Record<CareSubscriptionPlan, string[]> = {
  free: [...FREE_FEATURES],
  plus: [...PLUS_FEATURES],
  pro: [...PRO_FEATURES],
} as const;

// Prueft ob ein Feature im aktuellen Plan verfuegbar ist
export function hasFeature(
  plan: CareSubscriptionPlan,
  feature: string,
): boolean {
  return PLAN_FEATURES[plan]?.includes(feature) ?? false;
}

// Caregiver-Beziehungstypen mit UI-Metadaten
export const CAREGIVER_RELATIONSHIP_TYPES: Array<{
  id: CaregiverRelationshipType;
  label: string;
}> = [
  { id: "partner", label: "Partner/in" },
  { id: "child", label: "Sohn/Tochter" },
  { id: "grandchild", label: "Enkel/in" },
  { id: "friend", label: "Freund/in" },
  { id: "volunteer", label: "Ehrenamtliche/r Pate" },
  { id: "other", label: "Sonstige" },
] as const;

// Heartbeat-Eskalationsstufen (Phase 1: 2 Stufen statt urspruenglich 4)
// Design-Doc 2026-04-10 Abschnitt 4.5:
//   0-24h ok -> null
//   24h-48h -> reminder_24h (sanfte Erinnerung an Bewohner)
//   > 48h   -> alert_48h (Benachrichtigung an eingeladene Angehoerige)
export const HEARTBEAT_ESCALATION = {
  reminder_after_hours: 24,
  alert_after_hours: 48,
} as const;

// Max Personen im Vertrauenskreis pro Bewohner
// Phase 1 Design-Doc 2026-04-10 Abschnitt 4.1: harter Cap 10, bewusst klein
// gegen Gruppen-Drift und fuer persoenliche Beziehung.
export const MAX_CAREGIVERS_PER_RESIDENT = 10;

// Einladungs-Code Konfiguration
export const INVITE_CODE_LENGTH = 8;
export const INVITE_CODE_EXPIRY_HOURS = 24;

// Heartbeat-Retention in Tagen
export const HEARTBEAT_RETENTION_DAYS = 90;

// === Art. 9 Einwilligungsmanagement ===

export const CARE_CONSENT_FEATURES: CareConsentFeature[] = [
  "sos",
  "checkin",
  "medications",
  "care_profile",
  "emergency_contacts",
  "ai_onboarding",
];

export const CARE_CONSENT_LABELS: Record<CareConsentFeature, string> = {
  sos: "SOS-Hilferufe",
  checkin: "Täglicher Check-in",
  medications: "Medikamenten-Verwaltung",
  care_profile: "Pflegeprofil",
  emergency_contacts: "Notfallkontakte & Eskalation",
  ai_onboarding: "KI-Assistent",
};

export const CARE_CONSENT_DESCRIPTIONS: Record<CareConsentFeature, string> = {
  sos: "Kategorien, Freitext-Notizen und GPS-Standort bei Hilferufen",
  checkin: "Tägliche Stimmungsabfrage und persönliche Notizen",
  medications: "Medikamentennamen, Dosierungen und Einnahmezeiten",
  care_profile: "Pflegegrad, medizinische Notizen und Versicherungsnummer",
  emergency_contacts:
    "Telefonnummern und Beziehungen Ihrer Notfallkontakte (erfordert SOS-Einwilligung)",
  ai_onboarding:
    "Übermittlung Ihrer Eingaben an Claude/Mistral für den Kennenlern-Wizard",
};

export const CURRENT_CONSENT_VERSION = "1.0";
