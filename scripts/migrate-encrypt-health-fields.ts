#!/usr/bin/env npx tsx
// scripts/migrate-encrypt-health-fields.ts
// Idempotentes Migrations-Script: Verschluesselt alle Klartext-Gesundheitsdaten (Art. 9 DSGVO)
// mit AES-256-GCM. Erkennt bereits verschluesselte Felder am Praefix "aes256gcm:" und
// ueberspringt sie — sichere Mehrfach-Ausfuehrung ohne Doppel-Verschluesselung.
//
// Voraussetzung: CARE_ENCRYPTION_KEY und SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
// muessen als Umgebungsvariablen gesetzt sein.
//
// Ausfuehrung:
//   npx tsx scripts/migrate-encrypt-health-fields.ts
//   npx tsx scripts/migrate-encrypt-health-fields.ts --dry-run    (nur zaehlen, nicht aendern)

import { createClient } from '@supabase/supabase-js';

// --- Encryption (inline, damit das Script standalone lauffaehig ist) ---
import { createCipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const ENCRYPTED_PREFIX = 'aes256gcm:';

function getKey(): Buffer {
  const keyHex = process.env.CARE_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      'CARE_ENCRYPTION_KEY muss als 64-stelliger Hex-String (32 Bytes) gesetzt sein. Bitte in .env.local setzen.'
    );
  }
  return Buffer.from(keyHex, 'hex');
}

function encrypt(text: string): string {
  if (!text) return '';
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();
  return `${ENCRYPTED_PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

function isEncrypted(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(ENCRYPTED_PREFIX);
}

// --- Konfiguration: Welche Tabellen/Felder migriert werden ---

interface MigrationTarget {
  table: string;
  fields: string[];
  idField: string; // Primary Key fuer das UPDATE
}

const MIGRATION_TARGETS: MigrationTarget[] = [
  {
    table: 'care_profiles',
    fields: ['medical_notes', 'preferred_hospital'],
    idField: 'id',
  },
  {
    table: 'care_medications',
    fields: ['name', 'dosage', 'instructions'],
    idField: 'id',
  },
  {
    table: 'care_checkins',
    fields: ['note'],
    idField: 'id',
  },
  {
    table: 'care_sos_alerts',
    fields: ['notes'],
    idField: 'id',
  },
  {
    table: 'care_sos_responses',
    fields: ['note'],
    idField: 'id',
  },
  {
    table: 'care_appointments',
    fields: ['location', 'notes'],
    idField: 'id',
  },
];

// --- Hauptlogik ---

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log('=== M3b: Gesundheitsdaten-Verschluesselung (Art. 9 DSGVO) ===');
  console.log(`Modus: ${dryRun ? 'DRY RUN (keine Aenderungen)' : 'LIVE'}`);
  console.log('');

  // Supabase-Client mit Service-Role-Key erstellen (umgeht RLS)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('FEHLER: NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY muessen gesetzt sein.');
    console.error('Tipp: source .env.local && npx tsx scripts/migrate-encrypt-health-fields.ts');
    process.exit(1);
  }

  // Key-Validierung frueh durchfuehren
  try {
    getKey();
    console.log('CARE_ENCRYPTION_KEY: OK (64 Hex-Zeichen)');
  } catch (err) {
    console.error(`FEHLER: ${(err as Error).message}`);
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let totalEncrypted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const target of MIGRATION_TARGETS) {
    console.log(`\n--- Tabelle: ${target.table} (Felder: ${target.fields.join(', ')}) ---`);

    // Alle Zeilen laden (Service-Role umgeht RLS)
    const { data: rows, error: fetchError } = await supabase
      .from(target.table)
      .select([target.idField, ...target.fields].join(', '));

    if (fetchError) {
      console.error(`  FEHLER beim Laden: ${fetchError.message}`);
      totalErrors++;
      continue;
    }

    if (!rows || rows.length === 0) {
      console.log('  Keine Datensaetze vorhanden — uebersprungen.');
      continue;
    }

    console.log(`  ${rows.length} Datensaetze gefunden.`);

    let tableEncrypted = 0;
    let tableSkipped = 0;

    for (const row of rows) {
      const updates: Record<string, string> = {};

      for (const field of target.fields) {
        const value = (row as unknown as Record<string, unknown>)[field];

        // Null/undefined/leerer String → ueberspringen
        if (!value || typeof value !== 'string') continue;

        // Bereits verschluesselt → idempotent ueberspringen
        if (isEncrypted(value)) {
          tableSkipped++;
          continue;
        }

        // Klartext → verschluesseln
        updates[field] = encrypt(value);
        tableEncrypted++;
      }

      // Nur updaten wenn mindestens ein Feld verschluesselt wurde
      if (Object.keys(updates).length > 0) {
        if (!dryRun) {
          const { error: updateError } = await supabase
            .from(target.table)
            .update(updates)
            .eq(target.idField, (row as unknown as Record<string, unknown>)[target.idField]);

          if (updateError) {
            console.error(`  FEHLER bei ID ${(row as unknown as Record<string, unknown>)[target.idField]}: ${updateError.message}`);
            totalErrors++;
          }
        }
      }
    }

    console.log(`  Verschluesselt: ${tableEncrypted} Felder | Uebersprungen (bereits verschluesselt): ${tableSkipped}`);
    totalEncrypted += tableEncrypted;
    totalSkipped += tableSkipped;
  }

  console.log('\n=== Zusammenfassung ===');
  console.log(`Verschluesselte Felder:        ${totalEncrypted}`);
  console.log(`Uebersprungene Felder:         ${totalSkipped}`);
  console.log(`Fehler:                        ${totalErrors}`);
  console.log(`Modus:                         ${dryRun ? 'DRY RUN (keine Aenderungen vorgenommen)' : 'LIVE'}`);

  if (dryRun && totalEncrypted > 0) {
    console.log('\n→ Fuehre das Script ohne --dry-run aus, um die Verschluesselung durchzufuehren.');
  }

  if (totalErrors > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unerwarteter Fehler:', err);
  process.exit(1);
});
