// components/care/index.ts
// Barrel-Export fuer alle Care-Komponenten
// Neue Komponenten hier eintragen fuer einfache Imports

// SOS-Komponenten
export { SosButton } from './SosButton';
export { SosCategoryPicker } from './SosCategoryPicker';
export { SosAlertCard } from './SosAlertCard';
export { SosStatusTracker } from './SosStatusTracker';

// Check-in-Komponenten
export { CheckinDialog } from './CheckinDialog';
export { CheckinHistory } from './CheckinHistory';

// Medikamenten-Komponenten
export { MedicationCard } from './MedicationCard';
export { MedicationList } from './MedicationList';
export { MedicationLogDialog } from './MedicationLogDialog';

// Termin-Komponenten
export { AppointmentCard } from './AppointmentCard';
export { AppointmentList } from './AppointmentList';
export { AppointmentForm } from './AppointmentForm';

// Helfer-Komponenten
export { HelperCard } from './HelperCard';
export { HelperList } from './HelperList';
export { HelperRegistrationForm } from './HelperRegistrationForm';

// Admin-Uebersicht
export { SystemOverview } from './SystemOverview';
export { PilotMetrics } from './PilotMetrics';

// Senior-Geraet (E-Ink)
export { SeniorSosButton } from './senior/SeniorSosButton';
export { SeniorCheckinButtons } from './senior/SeniorCheckinButtons';
export { SeniorStatusScreen } from './senior/SeniorStatusScreen';
export { SeniorMedicationScreen } from './senior/SeniorMedicationScreen';
