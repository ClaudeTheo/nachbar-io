// lib/health-feature-gate.ts
// Mapping Gesundheits-Routes -> Feature-Flag-Keys.
// Quelle der Wahrheit fuer Middleware-Gate (proxy.ts) und UI-Kacheln (care hub).

export const HEALTH_ROUTES = [
  { prefix: "/care/medications", flag: "MEDICATIONS_ENABLED" },
  { prefix: "/care/aerzte", flag: "DOCTORS_ENABLED" },
  { prefix: "/care/appointments", flag: "APPOINTMENTS_ENABLED" },
  { prefix: "/care/sprechstunde", flag: "VIDEO_CONSULTATION" },
  { prefix: "/care/consultations", flag: "VIDEO_CONSULTATION" },
  { prefix: "/care/heartbeat", flag: "HEARTBEAT_ENABLED" },
  { prefix: "/care/checkin", flag: "HEARTBEAT_ENABLED" },
  { prefix: "/arzt", flag: "GDT_ENABLED" },
] as const;

export type HealthFlagKey =
  | "MEDICATIONS_ENABLED"
  | "DOCTORS_ENABLED"
  | "APPOINTMENTS_ENABLED"
  | "VIDEO_CONSULTATION"
  | "HEARTBEAT_ENABLED"
  | "GDT_ENABLED";

export function getRequiredFlagForRoute(pathname: string): HealthFlagKey | null {
  const match = HEALTH_ROUTES.find(
    (r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"),
  );
  return (match?.flag as HealthFlagKey) ?? null;
}

export function isHealthRoute(pathname: string): boolean {
  return getRequiredFlagForRoute(pathname) !== null;
}
