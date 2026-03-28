// Nachbar Hilfe — Verbindungs-Logik (Helfer <-> Senior)
import { getMaxClients } from "./federal-states";

const INVITE_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Ohne I/O/0/1 (Verwechslungsgefahr)
const INVITE_CODE_LENGTH = 6;
const INVITE_CODE_VALIDITY_HOURS = 24;

/**
 * Generiert einen 6-stelligen Einladungscode (Grossbuchstaben + Ziffern).
 * Ohne I, O, 0, 1 um Verwechslung zu vermeiden.
 */
export function generateInviteCode(): string {
  const bytes = new Uint8Array(INVITE_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(
    bytes,
    (b) => INVITE_CODE_CHARS[b % INVITE_CODE_CHARS.length],
  ).join("");
}

/**
 * Validiert Format eines Einladungscodes (6 Zeichen, Grossbuchstaben + Ziffern).
 */
export function isValidInviteCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code);
}

/**
 * Prueft ob ein Einladungscode noch gueltig ist (24h).
 */
export function isInviteCodeExpired(createdAt: string): boolean {
  const created = new Date(createdAt);
  const now = new Date();
  const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
  return diffHours > INVITE_CODE_VALIDITY_HOURS;
}

/**
 * Prueft ob der Helfer das Bundesland-Limit fuer aktive Verbindungen erreicht hat.
 * Gibt null zurueck wenn kein Limit existiert.
 */
export function checkConnectionLimit(
  federalState: string,
  activeConnectionCount: number,
): { allowed: boolean; max: number | null; current: number } {
  const max = getMaxClients(federalState);
  return {
    allowed: max === null || activeConnectionCount < max,
    max,
    current: activeConnectionCount,
  };
}
