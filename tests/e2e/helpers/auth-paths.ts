// Nachbar.io — Auth-Pfade fuer storageState (Config-safe, kein test-Import)
import * as path from "path";

/** Verzeichnis fuer gespeicherte Auth-States */
export const AUTH_DIR = path.resolve(__dirname, "../../../.auth");

/** Pfad zum storageState fuer einen Agenten */
export function authFile(agentId: string): string {
  return path.join(AUTH_DIR, `${agentId}.json`);
}
