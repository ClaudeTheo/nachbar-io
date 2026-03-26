// __tests__/lib/care/encryption-real.test.ts
// Block D.11: ECHTE AES-256-GCM Verschluesselung testen (nicht gemockt!)
// Regulatorisch kritisch: Art. 9 DSGVO, ISO 14971

import { describe, it, expect, vi, beforeEach } from "vitest";

// Test-Key: 32 Bytes = 64 Hex-Zeichen (nur fuer Tests!)
const TEST_KEY = "a".repeat(64); // 32 Bytes als Hex

beforeEach(() => {
  vi.stubEnv("CARE_ENCRYPTION_KEY", TEST_KEY);
});

describe("AES-256-GCM Crypto (echte Verschluesselung)", () => {
  it("encrypt → decrypt Round-Trip fuer medizinische Notizen", async () => {
    const { encrypt, decrypt } = await import("@/lib/care/crypto");

    const klartext = "Patient nimmt Metformin 500mg, 2x taeglich";
    const verschluesselt = encrypt(klartext);

    // Verschluesselt ist NICHT gleich Klartext
    expect(verschluesselt).not.toBe(klartext);
    expect(verschluesselt).not.toContain("Metformin");
    expect(verschluesselt).toMatch(/^aes256gcm:/);

    // Entschluesseln gibt exakten Klartext zurueck
    const entschluesselt = decrypt(verschluesselt);
    expect(entschluesselt).toBe(klartext);
  });

  it("verschluesselte Werte enthalten KEIN Klartext-Fragment", async () => {
    const { encrypt } = await import("@/lib/care/crypto");

    const sensibel = "Insulin Lantus 20IE, Blutzucker 180mg/dl";
    const verschluesselt = encrypt(sensibel);

    // Keines der medizinischen Woerter darf im Ciphertext auftauchen
    expect(verschluesselt).not.toContain("Insulin");
    expect(verschluesselt).not.toContain("Lantus");
    expect(verschluesselt).not.toContain("Blutzucker");
    expect(verschluesselt).not.toContain("180");
  });

  it("zwei Verschluesselungen des gleichen Texts erzeugen unterschiedliche Ciphertexte (IV-Zufaelligkeit)", async () => {
    const { encrypt } = await import("@/lib/care/crypto");

    const text = "Identischer medizinischer Text";
    const enc1 = encrypt(text);
    const enc2 = encrypt(text);

    // Verschiedene IVs → verschiedene Ciphertexte
    expect(enc1).not.toBe(enc2);
  });

  it("Manipulation des Ciphertexts fuehrt zu Fehler (Authenticity)", async () => {
    const { encrypt, decrypt } = await import("@/lib/care/crypto");

    const verschluesselt = encrypt("Geheimer Text");

    // Base64-Manipulation: ersetze den gesamten Ciphertext-Teil
    const parts = verschluesselt.split(":");
    // parts: [prefix+iv, authTag, ciphertext]
    // Manipuliere den AuthTag komplett
    parts[1] = Buffer.from("manipuliert12345").toString("base64");
    const starkManipuliert = parts.join(":");
    expect(() => decrypt(starkManipuliert)).toThrow();
  });

  it("fehlender Key wirft klaren Fehler", async () => {
    vi.stubEnv("CARE_ENCRYPTION_KEY", "");
    // Muss Module neu laden um die Env-Aenderung zu sehen
    vi.resetModules();
    const { encrypt } = await import("@/lib/care/crypto");

    expect(() => encrypt("Test")).toThrow("CARE_ENCRYPTION_KEY");
  });

  it("zu kurzer Key wirft Fehler", async () => {
    vi.stubEnv("CARE_ENCRYPTION_KEY", "zu_kurz");
    vi.resetModules();
    const { encrypt } = await import("@/lib/care/crypto");

    expect(() => encrypt("Test")).toThrow("CARE_ENCRYPTION_KEY");
  });

  it("leerer String wird unveraendert zurueckgegeben", async () => {
    const { encrypt } = await import("@/lib/care/crypto");
    expect(encrypt("")).toBe("");
  });
});

describe("Field-Encryption Helper (echte Verschluesselung)", () => {
  it("encryptFields verschluesselt nur benannte Felder", async () => {
    vi.resetModules();
    const { encryptFields, decryptFields, CARE_MEDICATIONS_ENCRYPTED_FIELDS } =
      await import("@/lib/care/field-encryption");

    const medikament = {
      id: "med-1",
      senior_id: "user-1",
      name: "Aspirin",
      dosage: "100mg",
      instructions: "Morgens nach dem Essen",
      active: true,
    };

    const verschluesselt = encryptFields(medikament, [
      ...CARE_MEDICATIONS_ENCRYPTED_FIELDS,
    ]);

    // ID und senior_id NICHT verschluesselt
    expect(verschluesselt.id).toBe("med-1");
    expect(verschluesselt.senior_id).toBe("user-1");
    expect(verschluesselt.active).toBe(true);

    // Name, Dosage, Instructions VERSCHLUESSELT
    expect(verschluesselt.name).not.toBe("Aspirin");
    expect(verschluesselt.dosage).not.toBe("100mg");
    expect(verschluesselt.instructions).not.toBe("Morgens nach dem Essen");
    expect(String(verschluesselt.name)).toMatch(/^aes256gcm:/);

    // Round-Trip: entschluesseln gibt Original zurueck
    const entschluesselt = decryptFields(verschluesselt, [
      ...CARE_MEDICATIONS_ENCRYPTED_FIELDS,
    ]);
    expect(entschluesselt.name).toBe("Aspirin");
    expect(entschluesselt.dosage).toBe("100mg");
    expect(entschluesselt.instructions).toBe("Morgens nach dem Essen");
  });

  it("isEncrypted erkennt verschluesselte Werte korrekt", async () => {
    vi.resetModules();
    const { isEncrypted, encryptField } =
      await import("@/lib/care/field-encryption");

    expect(isEncrypted("normaler text")).toBe(false);
    expect(isEncrypted(null)).toBe(false);
    expect(isEncrypted(undefined)).toBe(false);
    expect(isEncrypted(42)).toBe(false);

    const enc = encryptField("geheim");
    expect(isEncrypted(enc)).toBe(true);
  });

  it("encryptField ist idempotent (doppelte Verschluesselung verhindert)", async () => {
    vi.resetModules();
    const { encryptField, decryptField } =
      await import("@/lib/care/field-encryption");

    const text = "Medizinische Notiz";
    const enc1 = encryptField(text)!;
    const enc2 = encryptField(enc1)!; // Zweite Verschluesselung

    // Darf NICHT doppelt verschluesselt sein
    expect(enc2).toBe(enc1);

    // Einmal entschluesseln reicht
    expect(decryptField(enc2)).toBe(text);
  });

  it("decryptField gibt Klartext unveraendert zurueck (Abwaertskompatibilitaet)", async () => {
    vi.resetModules();
    const { decryptField } = await import("@/lib/care/field-encryption");

    // Alte Daten ohne Verschluesselung
    expect(decryptField("Alter unverschluesselter Wert")).toBe(
      "Alter unverschluesselter Wert",
    );
  });

  it("null/undefined werden durchgereicht", async () => {
    vi.resetModules();
    const { encryptField, decryptField } =
      await import("@/lib/care/field-encryption");

    expect(encryptField(null)).toBeNull();
    // undefined wird als null zurueckgegeben (cast in der Funktion)
    expect(encryptField(undefined)).toBeFalsy();
    expect(decryptField(null)).toBeNull();
    expect(decryptField(undefined)).toBeFalsy();
  });
});
