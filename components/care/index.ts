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

// Senior-Geraet (E-Ink)
export { SeniorSosButton } from './senior/SeniorSosButton';
export { SeniorCheckinButtons } from './senior/SeniorCheckinButtons';
export { SeniorStatusScreen } from './senior/SeniorStatusScreen';
