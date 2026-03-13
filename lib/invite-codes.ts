// Nachbar.io — Kryptografisch sichere Einladungscodes
// Base32-Alphabet ohne verwechselbare Zeichen (kein 0/O, 1/I, 8/B)

const ALPHABET = "ACDEFGHJKLMNPQRSTUVWXYZ2345679";

// Format: XXXX-XXXX (8 Zeichen = 30^8 ≈ 656 Mrd. Kombinationen)
const CODE_LENGTH = 8;

// Sicheren Code generieren (Browser oder Server) — ohne Modulo-Bias
export function generateSecureCode(): string {
  const alphabetLen = ALPHABET.length; // 29
  // Rejection-Sampling: Nur Werte < groesstes Vielfaches von alphabetLen akzeptieren
  const maxValid = Math.floor(256 / alphabetLen) * alphabetLen; // 232 (= 8 * 29)

  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    let value: number;
    do {
      const buf = new Uint8Array(1);
      if (typeof globalThis.crypto !== "undefined") {
        globalThis.crypto.getRandomValues(buf);
      } else {
        buf[0] = Math.floor(Math.random() * 256);
      }
      value = buf[0];
    } while (value >= maxValid); // Werte >= 232 verwerfen (Bias-Korrektur)
    code += ALPHABET[value % alphabetLen];
  }

  return code;
}

// Code mit Bindestrich formatieren (XXXX-XXXX)
export function formatCode(code: string): string {
  const clean = code.replace(/[-\s]/g, "").toUpperCase();
  if (clean.length <= 4) return clean;
  return `${clean.slice(0, 4)}-${clean.slice(4, 8)}`;
}

// Code normalisieren (Bindestriche/Leerzeichen entfernen, uppercase)
export function normalizeCode(code: string): string {
  return code.replace(/[-\s]/g, "").toUpperCase();
}

// Pruefen ob ein Code einem gueltigen Format entspricht
// Akzeptiert sowohl neue Codes (XXXX-XXXX, Base32) als auch alte (z.B. PKD001, SAN042)
export function isValidCodeFormat(code: string): boolean {
  const clean = normalizeCode(code);

  // Neues Format: 8 Zeichen, nur Base32-Alphabet
  if (clean.length === CODE_LENGTH && [...clean].every((ch) => ALPHABET.includes(ch))) {
    return true;
  }

  // Altes Format: 3 Buchstaben + 3 Ziffern (z.B. PKD001, SAN042, ORE003)
  if (/^[A-Z]{3}\d{3}$/.test(clean)) {
    return true;
  }

  // Quartier-Prefix-Format: PREFIX-XXXX-XXXX (Prefix + 8 Zeichen Base32)
  const raw = code.replace(/\s/g, "").toUpperCase();
  const prefixMatch = raw.match(/^([A-Z]{2,6})-(.{4,5})-(.{4})$/);
  if (prefixMatch) {
    const codeBody = (prefixMatch[2] + prefixMatch[3]).replace(/-/g, "");
    if (codeBody.length === CODE_LENGTH && [...codeBody].every((ch) => ALPHABET.includes(ch))) {
      return true;
    }
  }

  return false;
}

// Pruefen ob ein Code dem neuen kryptografischen Format entspricht
export function isNewCodeFormat(code: string): boolean {
  const clean = normalizeCode(code);
  if (clean.length !== CODE_LENGTH) return false;
  return [...clean].every((ch) => ALPHABET.includes(ch));
}

// Generiert einen quartier-spezifischen Invite-Code (PREFIX-XXXX-XXXX)
export function generateQuarterCode(prefix: string): string {
  const code = generateSecureCode();
  return `${prefix.toUpperCase()}-${formatCode(code)}`;
}

// Extrahiert den Prefix aus einem quartier-spezifischen Code
export function extractQuarterPrefix(code: string): string | null {
  const normalized = code.toUpperCase().trim();
  const parts = normalized.split("-");
  if (parts.length >= 3) {
    // Format: PREFIX-XXXX-XXXX
    return parts[0];
  }
  return null;
}

// Validiert ob ein Code zum erwarteten Quartier-Prefix passt
export function isValidQuarterCode(code: string, expectedPrefix: string): boolean {
  const prefix = extractQuarterPrefix(code);
  return prefix === expectedPrefix.toUpperCase();
}

// Temporaeres Passwort generieren (fuer Admin-Kontoerstellung) — ohne Modulo-Bias
export function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const maxValid = Math.floor(256 / chars.length) * chars.length;
  let password = "";
  for (let i = 0; i < 12; i++) {
    let value: number;
    do {
      const buf = new Uint8Array(1);
      if (typeof globalThis.crypto !== "undefined") {
        globalThis.crypto.getRandomValues(buf);
      } else {
        buf[0] = Math.floor(Math.random() * 256);
      }
      value = buf[0];
    } while (value >= maxValid);
    password += chars[value % chars.length];
  }
  return password;
}
