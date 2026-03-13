// scripts/run-migration-040.mjs
// Fuehrt Migration 040 (RLS-Sicherheit) ueber die Supabase SQL-API aus

import { readFileSync } from 'fs';

// Env laden
const envContent = readFileSync('.env.local', 'utf8');
const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
const serviceKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim();

if (!supabaseUrl || !serviceKey) {
  console.error('SUPABASE_URL oder SERVICE_ROLE_KEY nicht in .env.local gefunden');
  process.exit(1);
}

// Migration SQL laden
const migrationSql = readFileSync('supabase/migrations/040_fix_rls_security.sql', 'utf8');

console.log('=== Migration 040: RLS-Sicherheit verschaerfen ===\n');
console.log('Supabase URL:', supabaseUrl);

// SQL-Statements einzeln ausfuehren (getrennt durch Semikolon + Leerzeilen)
// Wir nutzen die pg-meta API fuer direkte SQL-Ausfuehrung
async function executeSql(sql) {
  // Versuche verschiedene bekannte Supabase SQL-Endpunkte
  const endpoints = [
    '/pg-meta/default/query',  // Supabase pg-meta endpoint
    '/rest/v1/rpc/exec_sql',   // Falls eine exec_sql Funktion existiert
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${supabaseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
          'X-Connection-Encrypted': '1',
        },
        body: JSON.stringify({ query: sql }),
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, endpoint, result };
      }

      const status = response.status;
      const text = await response.text().catch(() => '');

      // 404 = Endpoint existiert nicht, naechsten versuchen
      if (status === 404) continue;

      // Anderer Fehler = Endpoint existiert aber SQL fehlgeschlagen
      return { success: false, endpoint, status, error: text };
    } catch (_err) {
      continue;
    }
  }

  return { success: false, error: 'Kein SQL-Endpunkt erreichbar' };
}

async function run() {
  // Erst testen ob ein SQL-Endpunkt verfuegbar ist
  const testResult = await executeSql('SELECT 1 as test');

  if (testResult.success) {
    console.log(`SQL-Endpunkt gefunden: ${testResult.endpoint}\n`);

    // Migration ausfuehren
    console.log('Fuehre Migration aus...\n');
    const result = await executeSql(migrationSql);

    if (result.success) {
      console.log('Migration 040 erfolgreich ausgefuehrt!\n');

      // Verifizierung: Policies pruefen
      const verifyResult = await executeSql(`
        SELECT policyname, tablename, cmd
        FROM pg_policies
        WHERE tablename IN ('households', 'household_members')
        ORDER BY tablename, policyname
      `);

      if (verifyResult.success && Array.isArray(verifyResult.result)) {
        console.log('Aktive Policies nach Migration:');
        for (const row of verifyResult.result) {
          console.log(`  - ${row.tablename}: ${row.policyname} (${row.cmd})`);
        }
      }

      console.log('\n=== Migration 040 abgeschlossen ===');
    } else {
      console.error('Migration fehlgeschlagen:', result.error);
      console.log('\nBitte fuehre das SQL manuell im Supabase SQL Editor aus.');
      console.log('Datei: supabase/migrations/040_fix_rls_security.sql');
      process.exit(1);
    }
  } else {
    // Kein SQL-Endpunkt verfuegbar — manueller Fallback
    console.log('Kein direkter SQL-Endpunkt verfuegbar.');
    console.log('Die Migration muss manuell im Supabase Dashboard ausgefuehrt werden.\n');
    console.log('ANLEITUNG:');
    console.log('1. Oeffne https://supabase.com/dashboard');
    console.log('2. Waehle dein Projekt');
    console.log('3. Gehe zu "SQL Editor"');
    console.log('4. Fuege den folgenden SQL-Code ein und klicke "Run":\n');
    console.log('─'.repeat(60));
    console.log(migrationSql);
    console.log('─'.repeat(60));
    console.log('\nNach erfolgreicher Ausfuehrung sind folgende Aenderungen aktiv:');
    console.log('  - households_invite_check Policy → ersetzt durch households_read_authenticated');
    console.log('  - hm_insert Policy → ersetzt durch hm_insert_restricted (mit Verifikationspruefung)');
    console.log('  - enforce_member_defaults() → KEINE Auto-Verifizierung mehr');
    console.log('  - Neue households_update Policy (nur Mitglieder + Admins)');
    console.log('  - Neue hm_delete_own_or_admin Policy');
  }
}

run().catch(err => {
  console.error('Unerwarteter Fehler:', err);
  process.exit(1);
});
