// modules/care/services/crypto-key-versioning.test.ts
// Nachbar.io — Tests fuer Schluessel-Versionierung (R6, Architektur-Review 2026-07-04)
// Ziel: Key-Rotation ohne Not-Migration. Solange nur CARE_ENCRYPTION_KEY (= Version 1)
// konfiguriert ist, bleibt das Ausgabeformat BYTE-KOMPATIBEL zu heute — die crypto.ts-Kopien
// in nachbar-arzt/-pflege/-admin lesen dieselben DB-Payloads und duerfen nicht brechen.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encrypt, decrypt } from "./crypto";

const KEY_V2 = "b".repeat(64);
const KEY_V3 = "c".repeat(64);

function clearRotationKeys() {
  delete process.env.CARE_ENCRYPTION_KEY_V2;
  delete process.env.CARE_ENCRYPTION_KEY_V3;
}

describe("care/crypto — Schluessel-Versionierung", () => {
  beforeEach(clearRotationKeys);
  afterEach(clearRotationKeys);

  it("ohne Rotations-Key bleibt das Ausgabeformat v1 (Cross-App-Kompatibilitaet)", () => {
    const encrypted = encrypt("Medikament: Metformin 500mg");
    expect(encrypted).toMatch(/^aes256gcm:v1:/);
    expect(decrypt(encrypted)).toBe("Medikament: Metformin 500mg");
  });

  it("mit CARE_ENCRYPTION_KEY_V2 verschluesselt encrypt im v2-Format mit Key-Id 2", () => {
    process.env.CARE_ENCRYPTION_KEY_V2 = KEY_V2;

    const encrypted = encrypt("Sensible Notiz nach Rotation");
    expect(encrypted).toMatch(/^aes256gcm:v2:2:/);
    expect(decrypt(encrypted)).toBe("Sensible Notiz nach Rotation");
  });

  it("entschluesselt alte v1-Payloads auch NACH der Rotation weiter (Key 1 bleibt gueltig)", () => {
    const legacy = encrypt("Bestandsdaten vor der Rotation");
    expect(legacy).toMatch(/^aes256gcm:v1:/);

    process.env.CARE_ENCRYPTION_KEY_V2 = KEY_V2;
    expect(decrypt(legacy)).toBe("Bestandsdaten vor der Rotation");
  });

  it("nutzt bei mehreren Rotations-Keys die hoechste Version", () => {
    process.env.CARE_ENCRYPTION_KEY_V2 = KEY_V2;
    process.env.CARE_ENCRYPTION_KEY_V3 = KEY_V3;

    const encrypted = encrypt("Neueste Key-Generation");
    expect(encrypted).toMatch(/^aes256gcm:v2:3:/);
    expect(decrypt(encrypted)).toBe("Neueste Key-Generation");

    // v2-Payloads mit Key-Id 2 bleiben parallel lesbar
    delete process.env.CARE_ENCRYPTION_KEY_V3;
    const v2Payload = encrypt("Zwischen-Generation");
    process.env.CARE_ENCRYPTION_KEY_V3 = KEY_V3;
    expect(decrypt(v2Payload)).toBe("Zwischen-Generation");
  });

  it("wirft einen klaren Fehler, wenn die Key-Version eines Payloads nicht konfiguriert ist", () => {
    process.env.CARE_ENCRYPTION_KEY_V2 = KEY_V2;
    const encrypted = encrypt("Mit Key 2 verschluesselt");
    delete process.env.CARE_ENCRYPTION_KEY_V2;

    expect(() => decrypt(encrypted)).toThrow(/CARE_ENCRYPTION_KEY_V2/);
  });

  it("wirft einen klaren Fehler bei falsch formatiertem Rotations-Key", () => {
    process.env.CARE_ENCRYPTION_KEY_V2 = "zu-kurz";
    expect(() => encrypt("egal")).toThrow(/CARE_ENCRYPTION_KEY_V2/);
  });

  it("wirft bei kaputtem v2-Payload (fehlende Teile) einen Formatfehler", () => {
    expect(() => decrypt("aes256gcm:v2:2:nur-ein-teil")).toThrow(
      /Verschluesselungsformat/,
    );
  });
});
