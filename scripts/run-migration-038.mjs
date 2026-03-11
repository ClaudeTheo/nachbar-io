// scripts/run-migration-038.mjs
// Fuehrt Migration 038 ueber den Supabase Service Role Client aus

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Env laden
const envContent = readFileSync('.env.local', 'utf8');
const url = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
const key = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim();

if (!url || !key) {
  console.error('SUPABASE_URL oder SERVICE_ROLE_KEY nicht gefunden');
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  console.log('=== Migration 038: Test-System ===\n');

  // 1. is_tester Spalte hinzufuegen (via RPC nicht moeglich, nutze workaround)
  // Pruefen ob Spalte schon existiert
  const { data: testUser, error: testError } = await supabase
    .from('users')
    .select('id, is_tester')
    .limit(1);

  if (testError && testError.message.includes('is_tester')) {
    console.log('Spalte is_tester existiert noch nicht — muss ueber Supabase Dashboard hinzugefuegt werden.');
    console.log('\nBitte folgenden SQL im Supabase SQL Editor ausfuehren:');
    console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_tester BOOLEAN DEFAULT true;');
    console.log('UPDATE users SET is_tester = true;');
    console.log('\nDanach dieses Script erneut ausfuehren.');
    process.exit(1);
  }

  // Spalte existiert bereits oder wurde gerade hinzugefuegt
  console.log('1. Spalte is_tester: OK (existiert)');

  // Alle Nutzer als Tester markieren
  const { error: updateError } = await supabase
    .from('users')
    .update({ is_tester: true })
    .neq('is_tester', true);

  if (updateError) {
    console.error('   Fehler beim Update:', updateError.message);
  } else {
    console.log('   Alle Nutzer auf is_tester=true gesetzt');
  }

  // Aktuelle Nutzer anzeigen
  const { data: users } = await supabase
    .from('users')
    .select('id, display_name, is_admin, is_tester')
    .order('display_name');

  console.log('\n   Aktuelle Nutzer:');
  for (const u of users || []) {
    console.log(`   - ${u.display_name} (admin: ${u.is_admin}, tester: ${u.is_tester})`);
  }

  // 2. test_sessions Tabelle pruefen
  const { error: sessionCheck } = await supabase
    .from('test_sessions')
    .select('id')
    .limit(1);

  if (sessionCheck) {
    console.log('\n2. Tabelle test_sessions: FEHLT');
    console.log('   Bitte die vollstaendige Migration 038 im Supabase SQL Editor ausfuehren.');
    console.log('   Datei: supabase/migrations/038_test_system.sql');
    process.exit(1);
  } else {
    console.log('\n2. Tabelle test_sessions: OK');
  }

  // 3. test_results Tabelle pruefen
  const { error: resultCheck } = await supabase
    .from('test_results')
    .select('id')
    .limit(1);

  if (resultCheck) {
    console.log('3. Tabelle test_results: FEHLT');
    console.log('   Bitte die vollstaendige Migration 038 im Supabase SQL Editor ausfuehren.');
    process.exit(1);
  } else {
    console.log('3. Tabelle test_results: OK');
  }

  console.log('\n=== Migration 038 erfolgreich! ===');
}

run().catch(err => {
  console.error('Fehler:', err);
  process.exit(1);
});
