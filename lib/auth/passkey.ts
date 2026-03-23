// lib/auth/passkey.ts
// WebAuthn/Passkey Konfiguration und Hilfsfunktionen

import { randomBytes } from 'crypto';

export interface PasskeyConfig {
  rpName: string;
  rpID: string;
  origin: string;
}

export function getPasskeyConfig(): PasskeyConfig {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    rpName: 'nachbar.io',
    rpID: isProd ? 'nachbar-io.vercel.app' : 'localhost',
    origin: isProd
      ? 'https://nachbar-io.vercel.app'
      : 'http://localhost:3000',
  };
}

export function generatePasskeySecret(): string {
  return randomBytes(32).toString('hex');
}

export const CHALLENGE_COOKIE = 'passkey_challenge';
export const CHALLENGE_MAX_AGE = 60;
