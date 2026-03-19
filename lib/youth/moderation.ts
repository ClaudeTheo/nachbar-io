// lib/youth/moderation.ts
// Jugend-Modul: Chat-Moderation — Keyword-Filter und Kontaktdaten-Erkennung

export interface ModerationResult {
  blocked: boolean;
  reason?: string;
  flagged?: boolean;
}

// Woerter-Listen (erweiterbar, in Phase 2 durch Claude Haiku ersetzen)
const BLOCKED_PATTERNS = [
  { pattern: /\b(idiot|doof|dumm|blöd|scheiß|fick|arsch|hurensohn|missgeburt)\b/i, reason: 'Beleidigung' },
  { pattern: /\b(\d+)\s*(euro|€|eur)\b/i, reason: 'Geld-Anfrage' },
  { pattern: /\b(bezahl|überweise|paypal|konto)\b/i, reason: 'Finanz-Thema' },
  { pattern: /\b(nackt|sex|porno)\b/i, reason: 'Unangemessener Inhalt' },
];

const CONTACT_PATTERNS = [
  /\b0\d{3,4}[\s/-]?\d{4,8}\b/,           // Telefonnummer
  /\+\d{2}\s?\d{3,4}\s?\d{4,8}/,           // Internationale Nummer
  /[\w.+-]+@[\w-]+\.[\w.]+/,                // E-Mail
  /@[\w]{2,}/,                               // Social-Media Handle
  /\b(instagram|snapchat|tiktok|whatsapp|telegram)\b/i,  // Plattform-Namen
];

export function filterMessage(text: string): ModerationResult {
  for (const { pattern, reason } of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return { blocked: true, reason };
    }
  }

  if (containsContactInfo(text)) {
    return { blocked: true, reason: 'Kontaktdaten nicht erlaubt im Chat. Bitte nutzen Sie den Aufgaben-Chat.' };
  }

  return { blocked: false };
}

export function containsContactInfo(text: string): boolean {
  return CONTACT_PATTERNS.some(pattern => pattern.test(text));
}
