# Care-Crypto Format-Versionierung

Datum: 2026-05-06 abend
Owner: Codex

## Kontext

Restpunkt aus dem Security-/Code-Quality-Handover:

- LOW: Encryption-Format ohne explizite Versionierung.
- Ziel: neue Ciphertexte versionieren, bestehende Daten weiter lesen.
- Keine Migration: bestehende Datenbankwerte bleiben im Legacy-Format und werden bei normaler Neuspeicherung automatisch im neuen Format geschrieben.

## Pre-Check

Codebase-weite Suche auf `encrypt`, `decrypt`, `aes`, `gcm`, `version`, `field-encryption`, `aes256gcm` ergab:

- Autoritative Implementierung: `modules/care/services/crypto.ts`
- Bruecke: `lib/care/crypto.ts` re-exportiert aus `modules/care/services/crypto.ts`
- Feldverschluesselung: `modules/care/services/field-encryption.ts` nutzt `encrypt`/`decrypt`
- Bestehende Tests: `modules/care/services/crypto.test.ts`, `lib/care/crypto.test.ts`, `__tests__/lib/care/encryption-real.test.ts`, Field-Encryption-Tests

Folgerung: bestehende Crypto-Implementierung erweitern, keine neue Crypto-Lib.

## Umsetzung

- Neue Encrypt-Ausgaben tragen jetzt `aes256gcm:v1:<iv>:<authTag>:<ciphertext>`.
- `decrypt` akzeptiert weiterhin bestehende Legacy-Werte `aes256gcm:<iv>:<authTag>:<ciphertext>`.
- `field-encryption` bleibt kompatibel, weil `isEncrypted` weiter auf das stabile `aes256gcm:`-Praefix prueft.

## Verifikation

- RED: `npx vitest run modules/care/services/crypto.test.ts` fiel erwartbar beim neuen `aes256gcm:v1:`-Format.
- GREEN: `npx vitest run modules/care/services/crypto.test.ts lib/care/crypto.test.ts __tests__/lib/care/encryption-real.test.ts modules/care/services/field-encryption.test.ts lib/care/field-encryption.test.ts` -> 68/68 gruen.
- `npx eslint modules/care/services/crypto.ts modules/care/services/crypto.test.ts` -> gruen.
- `npx tsc --noEmit` -> gruen.
- `git diff --check` -> gruen.
- `npm run build` -> gruen.

## Rote Zonen

Kein Push, kein Deploy, keine Prod-DB/Migration, keine Vercel-Env-/Secret-Aenderung.
