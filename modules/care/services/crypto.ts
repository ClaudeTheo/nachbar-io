// lib/care/crypto.ts
// AES-256-GCM Verschluesselung fuer sensible Pflegedaten
// Schluessel: Umgebungsvariable CARE_ENCRYPTION_KEY (32 Bytes hex)

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const PREFIX = "aes256gcm:";
const FORMAT_VERSION = "v1";

function getKey(): Buffer {
  const keyHex = process.env.CARE_ENCRYPTION_KEY?.trim();
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      "CARE_ENCRYPTION_KEY muss als 64-stelliger Hex-String (32 Bytes) gesetzt sein",
    );
  }
  return Buffer.from(keyHex, "hex");
}

/**
 * Verschluesselt einen Klartext-String mit AES-256-GCM.
 * Rueckgabe: "aes256gcm:v1:<iv>:<authTag>:<ciphertext>" (alles Base64)
 */
export function encrypt(text: string): string {
  if (!text) return "";

  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();

  return `${PREFIX}${FORMAT_VERSION}:${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
}

/**
 * Entschluesselt einen mit encrypt() verschluesselten String.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";

  if (!encryptedText.startsWith(PREFIX)) {
    throw new Error("Ungueltiges Verschluesselungsformat: Praefix fehlt");
  }

  const rawParts = encryptedText.slice(PREFIX.length).split(":");
  const parts = rawParts[0] === FORMAT_VERSION ? rawParts.slice(1) : rawParts;
  if (rawParts[0] !== FORMAT_VERSION && rawParts.length !== 3) {
    throw new Error(
      "Ungueltiges Verschluesselungsformat: Erwarte v1:iv:authTag:ciphertext oder iv:authTag:ciphertext",
    );
  }
  if (rawParts[0] === FORMAT_VERSION && parts.length !== 3) {
    throw new Error(
      "Ungueltiges Verschluesselungsformat: Erwarte v1:iv:authTag:ciphertext",
    );
  }

  const [ivB64, authTagB64, ciphertextB64] = parts;
  const key = getKey();
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextB64, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
