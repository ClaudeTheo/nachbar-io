// Nachbar.io — Kryptografisch sichere Einladungscodes
// Base32-Alphabet ohne verwechselbare Zeichen (kein 0/O, 1/I, 8/B)

const ALPHABET = "ACDEFGHJKLMNPQRSTUVWXYZ2345679";

// Format: XXXX-XXXX (8 Zeichen = 30^8 ≈ 656 Mrd. Kombinationen)
const CODE_LENGTH = 8;

// Sicheren Code generieren (Browser oder Server)
export function generateSecureCode(): string {
  const values = new Uint8Array(CODE_LENGTH);
  if (typeof globalThis.crypto !== "undefined") {
    globalThis.crypto.getRandomValues(values);
  } else {
    // Fallback fuer Umgebungen ohne Web Crypto API
    for (let i = 0; i < CODE_LENGTH; i++) {
      values[i] = Math.floor(Math.random() * 256);
    }
  }

  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[values[i] % ALPHABET.length];
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

  return false;
}

// Pruefen ob ein Code dem neuen kryptografischen Format entspricht
export function isNewCodeFormat(code: string): boolean {
  const clean = normalizeCode(code);
  if (clean.length !== CODE_LENGTH) return false;
  return [...clean].every((ch) => ALPHABET.includes(ch));
}

// Temporaeres Passwort generieren (fuer Admin-Kontoerstellung)
export function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const values = new Uint8Array(12);
  if (typeof globalThis.crypto !== "undefined") {
    globalThis.crypto.getRandomValues(values);
  } else {
    for (let i = 0; i < 12; i++) {
      values[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(values, (v) => chars[v % chars.length]).join("");
}
