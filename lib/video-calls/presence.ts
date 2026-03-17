// Presence-Modul: Online-Status via Supabase Realtime Presence
// Design-Ref: docs/plans/2026-03-17-pi-kiosk-welle3-videochat-design.md, Abschnitt 8

export const PRESENCE_TIMEOUT_MS = 60_000; // 60 Sekunden

export type PresenceType = 'terminal' | 'user';

/**
 * Generiert den Supabase Realtime Channel-Namen fuer Presence.
 */
export function getPresenceChannelName(type: PresenceType, id: string): string {
  return `presence:${type}:${id}`;
}

/**
 * Prueft ob ein Nutzer als online gilt (letztes Signal innerhalb Timeout).
 */
export function isUserOnline(lastSeen: string | null, now: number = Date.now()): boolean {
  if (!lastSeen) return false;
  const lastSeenMs = new Date(lastSeen).getTime();
  return (now - lastSeenMs) < PRESENCE_TIMEOUT_MS;
}
