// lib/__tests__/invite-codes.test.ts
// Unit-Tests fuer Einladungscode-Funktionen (inkl. Multi-Quartier Erweiterungen)

import { describe, it, expect } from "vitest";
import {
  generateSecureCode,
  formatCode,
  normalizeCode,
  isValidCodeFormat,
  isNewCodeFormat,
  generateQuarterCode,
  extractQuarterPrefix,
  isValidQuarterCode,
  generateTempPassword,
} from "../invite-codes";

const ALPHABET = "ACDEFGHJKLMNPQRSTUVWXYZ2345679";

describe("generateSecureCode", () => {
  it("generiert einen 8-Zeichen-Code", () => {
    const code = generateSecureCode();
    expect(code).toHaveLength(8);
  });

  it("verwendet nur Zeichen aus dem Base32-Alphabet", () => {
    for (let i = 0; i < 20; i++) {
      const code = generateSecureCode();
      for (const ch of code) {
        expect(ALPHABET).toContain(ch);
      }
    }
  });

  it("generiert unterschiedliche Codes", () => {
    const codes = new Set(Array.from({ length: 10 }, () => generateSecureCode()));
    // Bei 10 Codes sollten mindestens 9 verschieden sein (statistisch fast sicher)
    expect(codes.size).toBeGreaterThanOrEqual(9);
  });
});

describe("formatCode", () => {
  it("formatiert 8 Zeichen als XXXX-XXXX", () => {
    expect(formatCode("ACDEFGHJ")).toBe("ACDE-FGHJ");
  });

  it("entfernt bestehende Bindestriche vor Formatierung", () => {
    expect(formatCode("ACDE-FGHJ")).toBe("ACDE-FGHJ");
  });

  it("gibt kurze Codes ohne Bindestrich zurueck", () => {
    expect(formatCode("ACDE")).toBe("ACDE");
  });

  it("konvertiert zu Grossbuchstaben", () => {
    expect(formatCode("acdefghj")).toBe("ACDE-FGHJ");
  });
});

describe("normalizeCode", () => {
  it("entfernt Bindestriche und Leerzeichen", () => {
    expect(normalizeCode("ACDE-FGHJ")).toBe("ACDEFGHJ");
    expect(normalizeCode("ACDE FGHJ")).toBe("ACDEFGHJ");
  });

  it("konvertiert zu Grossbuchstaben", () => {
    expect(normalizeCode("acde-fghj")).toBe("ACDEFGHJ");
  });
});

describe("isValidCodeFormat", () => {
  it("akzeptiert neues Format XXXX-XXXX (Base32)", () => {
    expect(isValidCodeFormat("ACDE-FGHJ")).toBe(true);
  });

  it("akzeptiert neues Format ohne Bindestrich", () => {
    expect(isValidCodeFormat("ACDEFGHJ")).toBe(true);
  });

  it("akzeptiert altes Format (3 Buchstaben + 3 Ziffern)", () => {
    expect(isValidCodeFormat("PKD001")).toBe(true);
    expect(isValidCodeFormat("SAN042")).toBe(true);
    expect(isValidCodeFormat("ORE003")).toBe(true);
  });

  it("akzeptiert Quartier-Prefix-Format PREFIX-XXXX-XXXX", () => {
    // Prefix muss 2-6 Zeichen lang sein (Regex-Beschraenkung in isValidCodeFormat)
    expect(isValidCodeFormat("REBBRG-ACDE-FGHJ")).toBe(true);
    expect(isValidCodeFormat("BS-ACDE-FGHJ")).toBe(true);
  });

  it("lehnt zu lange Prefixe ab (>6 Zeichen)", () => {
    // "REBBERG" hat 7 Zeichen — wird vom Prefix-Regex nicht erkannt
    expect(isValidCodeFormat("REBBERG-ACDE-FGHJ")).toBe(false);
  });

  it("lehnt ungueltiges Format ab", () => {
    expect(isValidCodeFormat("ABC")).toBe(false);
    expect(isValidCodeFormat("1234567890")).toBe(false);
    expect(isValidCodeFormat("")).toBe(false);
  });

  it("lehnt Codes mit ungueltigen Zeichen ab (0, O, 1, I, 8, B)", () => {
    expect(isValidCodeFormat("OOOOOOOO")).toBe(false);
    expect(isValidCodeFormat("11111111")).toBe(false);
  });
});

describe("isNewCodeFormat", () => {
  it("erkennt neues Base32-Format", () => {
    expect(isNewCodeFormat("ACDEFGHJ")).toBe(true);
  });

  it("lehnt altes Format ab", () => {
    expect(isNewCodeFormat("PKD001")).toBe(false);
  });

  it("lehnt zu kurze/lange Codes ab", () => {
    expect(isNewCodeFormat("ACDE")).toBe(false);
    expect(isNewCodeFormat("ACDEFGHJK")).toBe(false);
  });
});

describe("generateQuarterCode", () => {
  it("generiert Format PREFIX-XXXX-XXXX", () => {
    const code = generateQuarterCode("REBBERG");
    expect(code).toMatch(/^REBBERG-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });

  it("konvertiert Prefix zu Grossbuchstaben", () => {
    const code = generateQuarterCode("rebberg");
    expect(code.startsWith("REBBERG-")).toBe(true);
  });

  it("generiert gueltige Base32-Codes im Body", () => {
    const code = generateQuarterCode("TEST");
    const parts = code.split("-");
    expect(parts[0]).toBe("TEST");
    const body = parts[1] + parts[2];
    expect(body).toHaveLength(8);
    for (const ch of body) {
      expect(ALPHABET).toContain(ch);
    }
  });
});

describe("extractQuarterPrefix", () => {
  it("extrahiert Prefix aus PREFIX-XXXX-XXXX Format", () => {
    expect(extractQuarterPrefix("REBBERG-ACDF-5679")).toBe("REBBERG");
  });

  it("gibt null zurueck bei Format ohne Prefix (XXXX-XXXX)", () => {
    expect(extractQuarterPrefix("ACDF-5679")).toBeNull();
  });

  it("gibt null zurueck bei Format ohne Bindestrich", () => {
    expect(extractQuarterPrefix("ACDF5679")).toBeNull();
  });

  it("konvertiert zu Grossbuchstaben", () => {
    expect(extractQuarterPrefix("rebberg-acdf-5679")).toBe("REBBERG");
  });

  it("extrahiert kurze Prefixe", () => {
    expect(extractQuarterPrefix("BS-ACDF-5679")).toBe("BS");
  });
});

describe("isValidQuarterCode", () => {
  it("gibt true zurueck wenn Prefix uebereinstimmt", () => {
    expect(isValidQuarterCode("REBBERG-ACDF-5679", "REBBERG")).toBe(true);
  });

  it("gibt false zurueck wenn Prefix nicht uebereinstimmt", () => {
    expect(isValidQuarterCode("PILOT-ACDF-5679", "REBBERG")).toBe(false);
  });

  it("ist case-insensitive", () => {
    expect(isValidQuarterCode("rebberg-acdf-5679", "Rebberg")).toBe(true);
  });

  it("gibt false zurueck wenn Code keinen Prefix hat", () => {
    expect(isValidQuarterCode("ACDF-5679", "REBBERG")).toBe(false);
  });
});

describe("generateTempPassword", () => {
  it("generiert ein 12-Zeichen Passwort", () => {
    const pw = generateTempPassword();
    expect(pw).toHaveLength(12);
  });

  it("generiert unterschiedliche Passwoerter", () => {
    const passwords = new Set(Array.from({ length: 10 }, () => generateTempPassword()));
    expect(passwords.size).toBeGreaterThanOrEqual(9);
  });
});
