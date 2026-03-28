// components/care/index.ts — Bruecke: Re-Export aus @/modules/care/components
// Alle Care-Komponenten wurden nach modules/care/components/ migriert.
// Diese Datei existiert nur fuer Abwaertskompatibilitaet.

// SOS-Komponenten
export { SosButton } from "@/modules/care/components/sos/SosButton";
export { SosCategoryPicker } from "@/modules/care/components/sos/SosCategoryPicker";
export { SosAlertCard } from "@/modules/care/components/sos/SosAlertCard";
export { SosStatusTracker } from "@/modules/care/components/sos/SosStatusTracker";
export { AlarmScreen } from "@/modules/care/components/sos/AlarmScreen";
export { CareAlarmProvider } from "@/modules/care/components/sos/CareAlarmProvider";

// Check-in-Komponenten
export { CheckinDialog } from "@/modules/care/components/checkin/CheckinDialog";
export { CheckinHistory } from "@/modules/care/components/checkin/CheckinHistory";
export { DailyCheckinButton } from "@/modules/care/components/checkin/DailyCheckinButton";
export { HeartbeatTimeline } from "@/modules/care/components/checkin/HeartbeatTimeline";

// Medikamenten-Komponenten
export { MedicationCard } from "@/modules/care/components/medication/MedicationCard";
export { MedicationList } from "@/modules/care/components/medication/MedicationList";
export { MedicationLogDialog } from "@/modules/care/components/medication/MedicationLogDialog";
export { MedicationForm } from "@/modules/care/components/medication/MedicationForm";
export { MedicationManagementList } from "@/modules/care/components/medication/MedicationManagementList";

// Termin-Komponenten
export { AppointmentCalendar } from "@/modules/care/components/appointments/AppointmentCalendar";
export { AppointmentCard } from "@/modules/care/components/appointments/AppointmentCard";
export { AppointmentForm } from "@/modules/care/components/appointments/AppointmentForm";
export { AppointmentList } from "@/modules/care/components/appointments/AppointmentList";
export { ConsultationConsent } from "@/modules/care/components/appointments/ConsultationConsent";
export { ConsultationSlotCard } from "@/modules/care/components/appointments/ConsultationSlotCard";
export { ConsultationSlotForm } from "@/modules/care/components/appointments/ConsultationSlotForm";
export { TechCheck } from "@/modules/care/components/appointments/TechCheck";

// Senior-Komponenten
export { SeniorSosButton } from "@/modules/care/components/senior/SeniorSosButton";
export { SeniorCheckinButtons } from "@/modules/care/components/senior/SeniorCheckinButtons";
export { SeniorStatusScreen } from "@/modules/care/components/senior/SeniorStatusScreen";
export { SeniorMedicationScreen } from "@/modules/care/components/senior/SeniorMedicationScreen";

// Helfer-Komponenten
export { HelperCard } from "@/modules/care/components/helpers/HelperCard";
export { HelperList } from "@/modules/care/components/helpers/HelperList";
export { HelperRegistrationForm } from "@/modules/care/components/helpers/HelperRegistrationForm";

// Bericht-Komponenten
export { ReportCard } from "@/modules/care/components/reports/ReportCard";
export { ReportList } from "@/modules/care/components/reports/ReportList";
export { ReportGenerator } from "@/modules/care/components/reports/ReportGenerator";
export { AuditLogViewer } from "@/modules/care/components/reports/AuditLogViewer";

// Abo-Komponenten
export { SubscriptionCard } from "@/modules/care/components/subscription/SubscriptionCard";
export { SubscriptionPlans } from "@/modules/care/components/subscription/SubscriptionPlans";
export { FeatureGate } from "@/modules/care/components/subscription/FeatureGate";
export { RedeemCodeBanner } from "@/modules/care/components/subscription/RedeemCodeBanner";
export { InviteCodeModal } from "@/modules/care/components/subscription/InviteCodeModal";

// Caregiver-Komponenten
export { CaregiverDashboard } from "@/modules/care/components/caregiver/CaregiverDashboard";
export { CaregiverList } from "@/modules/care/components/caregiver/CaregiverList";
export { CaregiverSettings } from "@/modules/care/components/caregiver/CaregiverSettings";
export { ResidentStatusCard } from "@/modules/care/components/caregiver/ResidentStatusCard";
export { RevokeDialog } from "@/modules/care/components/caregiver/RevokeDialog";

// Consent-Komponenten
export { CareConsentGate } from "@/modules/care/components/consent/CareConsentGate";
export { ConsentFeatureCard } from "@/modules/care/components/consent/ConsentFeatureCard";
export { CareDisclaimer } from "@/modules/care/components/consent/CareDisclaimer";

// Task-Komponenten
export {
  TaskCard,
  CATEGORY_CONFIG,
} from "@/modules/care/components/tasks/TaskCard";
export type {
  CareTask,
  TaskCategory,
} from "@/modules/care/components/tasks/TaskCard";
export { TaskForm } from "@/modules/care/components/tasks/TaskForm";

// Shopping-Komponenten
export { ShoppingRequestCard } from "@/modules/care/components/shopping/ShoppingRequestCard";
export type { ShoppingRequest } from "@/modules/care/components/shopping/ShoppingRequestCard";
export { ShoppingRequestForm } from "@/modules/care/components/shopping/ShoppingRequestForm";

// Admin-Komponenten
export { SystemOverview } from "@/modules/care/components/admin/SystemOverview";
export { PilotMetrics } from "@/modules/care/components/admin/PilotMetrics";

// Kiosk-Komponenten
export { KioskPhotoUpload } from "@/modules/care/components/kiosk/KioskPhotoUpload";
export { KioskReminderForm } from "@/modules/care/components/kiosk/KioskReminderForm";

// Profil
export { CareProfileForm } from "@/modules/care/components/profile/CareProfileForm";

// Fehlerbehandlung
export { CareErrorBoundary } from "@/modules/care/components/shared/CareErrorBoundary";
