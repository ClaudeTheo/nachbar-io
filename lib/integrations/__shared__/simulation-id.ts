// Manuell eingefuegte Test-Warnungen (Prefix "sim-") werden nie von echten
// Providern zurueckgeliefert. Der Lifecycle-Sync muss sie ueberspringen,
// sonst markiert der erste Cron-Lauf sie als expired.
export function isSimulationId(externalId: string): boolean {
  return externalId.startsWith("sim-");
}
