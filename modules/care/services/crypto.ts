// lib/care/crypto.ts
// AES-256-GCM Verschluesselung fuer sensible Pflegedaten
// Schluessel: CARE_ENCRYPTION_KEY (= Version 1) + optionale Rotations-Keys
// CARE_ENCRYPTION_KEY_V2, _V3, ... (32 Bytes hex). Verschluesselt wird immer
// mit der hoechsten konfigurierten Version; entschluesselt wird jede Version.
// WICHTIG: Solange nur Version 1 konfiguriert ist, bleibt das Ausgabeformat
// byte-kompatibel ("aes256gcm:v1:...") — die crypto.ts-Kopien in nachbar-arzt/
// -pflege/-admin lesen dieselben DB-Payloads. Rotations-Ablauf:
// docs/security/key-rotation-runbook.md

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const PREFIX = "aes256gcm:";
const FORMAT_VERSION = "v1";
// v2-Format traegt die Key-Version im Payload: "aes256gcm:v2:<keyId>:<iv>:<authTag>:<ciphertext>"
const KEYED_FORMAT_VERSION = "v2";
const ROTATION_KEY_PATTERN = /^CARE_ENCRYPTION_KEY_V(\d+)$/;

function keyEnvName(version: number): string {
  return version === 1 ? "CARE_ENCRYPTION_KEY" : `CARE_ENCRYPTION_KEY_V${version}`;
}

function getKeyForVersion(version: number): Buffer {
  const envName = keyEnvName(version);
  const keyHex = process.env[envName]?.trim();
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      `${envName} muss als 64-stelliger Hex-String (32 Bytes) gesetzt sein`,
    );
  }
  return Buffer.from(keyHex, "hex");
}

/** Hoechste konfigurierte Key-Version (1, wenn keine Rotations-Keys gesetzt sind). */
function getActiveKeyVersion(): number {
  let highest = 1;
  for (const name of Object.keys(process.env)) {
    const match = ROTATION_KEY_PATTERN.exec(name);
    if (match) {
      const version = Number(match[1]);
      if (version > highest && process.env[name]?.trim()) {
        highest = version;
      }
    }
  }
  return highest;
}

/**
 * Verschluesselt einen Klartext-String mit AES-256-GCM.
 * Rueckgabe (nur Key 1 konfiguriert): "aes256gcm:v1:<iv>:<authTag>:<ciphertext>"
 * Rueckgabe (Rotations-Key aktiv):    "aes256gcm:v2:<keyId>:<iv>:<authTag>:<ciphertext>"
 */
export function encrypt(text: string): string {
  if (!text) return "";

  const keyVersion = getActiveKeyVersion();
  const key = getKeyForVersion(keyVersion);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();

  const body = `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;

  if (keyVersion === 1) {
    // Byte-kompatibel zum Bestandsformat (Cross-App-Leser!)
    return `${PREFIX}${FORMAT_VERSION}:${body}`;
  }
  return `${PREFIX}${KEYED_FORMAT_VERSION}:${keyVersion}:${body}`;
}

/**
 * Entschluesselt einen mit encrypt() verschluesselten String.
 * Unterstuetzt: legacy ("aes256gcm:iv:tag:ct"), v1 und v2 (mit Key-Id).
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";

  if (!encryptedText.startsWith(PREFIX)) {
    throw new Error("Ungueltiges Verschluesselungsformat: Praefix fehlt");
  }

  const rawParts = encryptedText.slice(PREFIX.length).split(":");

  let keyVersion = 1;
  let parts: string[];

  if (rawParts[0] === KEYED_FORMAT_VERSION) {
    // v2:<keyId>:<iv>:<authTag>:<ciphertext>
    parts = rawParts.slice(2);
    const keyId = Number(rawParts[1]);
    if (!Number.isInteger(keyId) || keyId < 1 || parts.length !== 3) {
      throw new Error(
        "Ungueltiges Verschluesselungsformat: Erwarte v2:keyId:iv:authTag:ciphertext",
      );
    }
    keyVersion = keyId;
  } else if (rawParts[0] === FORMAT_VERSION) {
    parts = rawParts.slice(1);
    if (parts.length !== 3) {
      throw new Error(
        "Ungueltiges Verschluesselungsformat: Erwarte v1:iv:authTag:ciphertext",
      );
    }
  } else {
    // Legacy-Format ohne Versions-Marker
    parts = rawParts;
    if (parts.length !== 3) {
      throw new Error(
        "Ungueltiges Verschluesselungsformat: Erwarte v1:iv:authTag:ciphertext oder iv:authTag:ciphertext",
      );
    }
  }

  const [ivB64, authTagB64, ciphertextB64] = parts;
  const key = getKeyForVersion(keyVersion);
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
