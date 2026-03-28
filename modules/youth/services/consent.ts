// modules/youth/services/consent.ts
// Jugend-Modul: Elternfreigabe — Token-Generierung und Hashing
import { createHash, randomBytes } from 'crypto';

export function generateConsentToken(): string {
  return randomBytes(16).toString('hex'); // 32 Zeichen
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function isTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

export const CONSENT_TEXT_VERSION = 'v1.0-2026-03-19';
export const TOKEN_EXPIRY_HOURS = 72;
export const MAX_TOKEN_SENDS = 3;
