// lib/civic/encryption.ts
// AES-256-GCM Verschluesselung fuer Civic-Postfach-Nachrichten
// Key: CIVIC_ENCRYPTION_KEY (serverseitig, NIE im Browser)

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const PREFIX = "civic:";

function getKey(): Buffer {
  const keyHex = process.env.CIVIC_ENCRYPTION_KEY?.trim();
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      "CIVIC_ENCRYPTION_KEY muss als 64-stelliger Hex-String (32 Bytes) gesetzt sein",
    );
  }
  return Buffer.from(keyHex, "hex");
}

/**
 * Verschluesselt einen Klartext-String mit AES-256-GCM.
 * Rueckgabe: "civic:<iv>:<authTag>:<ciphertext>" (alles Base64)
 */
export function encryptCivicField(text: string): string {
  if (!text) return "";

  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
}

/**
 * Entschluesselt einen mit encryptCivicField() verschluesselten String.
 */
export function decryptCivicField(encryptedText: string): string {
  if (!encryptedText) return "";

  if (!encryptedText.startsWith(PREFIX)) {
    throw new Error("Ungueltiges Civic-Verschluesselungsformat: Praefix fehlt");
  }

  const parts = encryptedText.slice(PREFIX.length).split(":");
  if (parts.length !== 3) {
    throw new Error(
      "Ungueltiges Civic-Verschluesselungsformat: Erwarte iv:authTag:ciphertext",
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
