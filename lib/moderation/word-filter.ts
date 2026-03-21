// Wortfilter fuer Vor-Moderation (Pre-Filter)
// Erkennt blockierte Inhalte und verdaechtige Muster

export interface PreFilterResult {
  blocked: boolean;
  suspicious: boolean;
  matchedPatterns: string[];
}

// Blockierte Muster — sofort sperren
const BLOCKED_PATTERNS: { pattern: RegExp; label: string }[] = [
  // Deutsche Beleidigungen
  { pattern: /\b(hurensohn|wichser|missgeburt|bastard|drecksau|arschloch|fotze|schlampe)\b/i, label: 'beleidigung' },
  // Bedrohungen
  { pattern: /\b(ich (bringe?|töte|schlage|verprügle) dich|du bist tot|ich (finde?|hole?) dich)\b/i, label: 'bedrohung' },
  { pattern: /\b(umbringen|abstechen|totschlagen|fertig machen)\b/i, label: 'bedrohung' },
  // Spam-Links (verdaechtige TLDs)
  { pattern: /https?:\/\/[^\s]+\.(ru|cn|tk|ml|ga|cf)\b/i, label: 'spam-link' },
  // Rassismus / Volksverhetzung
  { pattern: /\b(kanake|neger|zigeuner|kameltreiber)\b/i, label: 'rassismus' },
];

// Verdaechtige Muster — zur KI-Pruefung weiterleiten
const SUSPICIOUS_PATTERNS: { pattern: RegExp; label: string }[] = [
  // Off-Platform-Kontaktversuche
  { pattern: /\b(whatsapp|telegram|signal|schreib mir auf|melde dich bei)\b/i, label: 'off-platform-kontakt' },
  // Preis-Anomalien / Scam-Muster
  { pattern: /\b(gratis iphone|kostenlos[es]* (ipad|samsung|macbook))\b/i, label: 'scam-angebot' },
  { pattern: /\b(bitcoin|krypto|schnell[es]* geld|100% gewinn)\b/i, label: 'scam-finanz' },
  // Verdaechtige Kontaktdaten in Marketplace
  { pattern: /\b(nur (per |via )?(paypal|überweisung|vorkasse))\b/i, label: 'scam-zahlung' },
];

/**
 * Vor-Filter fuer Inhalte — prueft auf blockierte und verdaechtige Muster.
 * Wird VOR der KI-Moderation aufgerufen, um offensichtliche Verstoesse sofort zu erkennen.
 */
export function preFilter(text: string): PreFilterResult {
  const matchedPatterns: string[] = [];
  let blocked = false;
  let suspicious = false;

  // Blockierte Muster pruefen
  for (const { pattern, label } of BLOCKED_PATTERNS) {
    // lastIndex zuruecksetzen fuer globale Regex-Flags
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      blocked = true;
      matchedPatterns.push(label);
    }
  }

  // Verdaechtige Muster pruefen
  for (const { pattern, label } of SUSPICIOUS_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      suspicious = true;
      matchedPatterns.push(label);
    }
  }

  return { blocked, suspicious, matchedPatterns };
}
