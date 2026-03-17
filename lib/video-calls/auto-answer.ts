// Auto-Answer-Logik fuer Kiosk-Videoanrufe
// Design-Ref: docs/plans/2026-03-17-pi-kiosk-welle3-videochat-design.md, Abschnitt 3

export interface AutoAnswerContact {
  autoAnswerAllowed: boolean;
  autoAnswerStart: string; // HH:MM Format
  autoAnswerEnd: string;   // HH:MM Format
  revokedAt: string | null;
}

export interface QuietHoursConfig {
  enabled: boolean;
  start: string; // HH:MM Format
  end: string;   // HH:MM Format
}

/**
 * Prueft ob eine Uhrzeit in einem Zeitfenster liegt.
 * Unterstuetzt Overnight-Fenster (start > end, z.B. 22:00–07:00).
 */
export function isInTimeWindow(now: string, start: string, end: string): boolean {
  if (start <= end) {
    // Tagesfenster: 08:00–20:00
    return now >= start && now <= end;
  } else {
    // Overnight: 22:00–07:00
    return now >= start || now <= end;
  }
}

/**
 * Entscheidet ob ein eingehender Anruf automatisch angenommen werden soll.
 * Regelhierarchie:
 * 1. Kontakt hat aktiven Link (nicht widerrufen)?
 * 2. auto_answer_allowed = true?
 * 3. Aktuelle Zeit im Kontakt-Zeitfenster?
 * 4. NICHT in globalen Ruhezeiten?
 */
export function shouldAutoAnswer(
  contact: AutoAnswerContact,
  quietHours: QuietHoursConfig,
  currentTime: string, // HH:MM Format
): boolean {
  // Link widerrufen?
  if (contact.revokedAt !== null) return false;

  // Auto-Answer nicht erlaubt?
  if (!contact.autoAnswerAllowed) return false;

  // Ausserhalb Kontakt-Zeitfenster?
  if (!isInTimeWindow(currentTime, contact.autoAnswerStart, contact.autoAnswerEnd)) return false;

  // In Quiet Hours?
  if (quietHours.enabled && isInTimeWindow(currentTime, quietHours.start, quietHours.end)) return false;

  return true;
}
