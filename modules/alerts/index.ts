// Barrel-Export fuer das alerts-Modul
// Komponenten
export { AlertLocationCheckbox } from "@/modules/alerts/components/AlertLocationCheckbox";
export { AlertMapLayer } from "@/modules/alerts/components/AlertMapLayer";
export { LocationConsentDialog } from "@/modules/alerts/components/LocationConsentDialog";
export { default as FamilyAlertMap } from "@/modules/alerts/components/FamilyAlertMap";

// Services
export { validateLocationData } from "@/modules/alerts/services/validate-location";
export {
  getLocationForRole,
  roundCoordinates,
} from "@/modules/alerts/services/location-visibility";
export type { LocationRole } from "@/modules/alerts/services/location-visibility";
