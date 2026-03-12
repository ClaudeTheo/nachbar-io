// Nachbar.io — Test-Accounts erstellen
// Erstellt 10 Test-Nutzer die sich direkt einloggen koennen (ohne Einladungscode)
//
// Voraussetzung: SUPABASE_SERVICE_ROLE_KEY in .env.local
// Ausfuehrung:   npx tsx scripts/create-test-users.ts

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

// .env.local laden
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("\n❌ Fehlende Umgebungsvariablen!");
  console.error("   Bitte SUPABASE_SERVICE_ROLE_KEY in .env.local eintragen.");
  console.error("   Den Key finden Sie im Supabase Dashboard:");
  console.error("   → Settings → API → service_role (secret)\n");
  process.exit(1);
}

// Admin-Client (umgeht RLS)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 10 Test-Nutzer, verteilt auf alle 3 Strassen
const TEST_USERS = [
  { num: 1,  name: "Test Eins",   householdCode: "PURK0001" },
  { num: 2,  name: "Test Zwei",   householdCode: "PURK0003" },
  { num: 3,  name: "Test Drei",   householdCode: "PURK0005" },
  { num: 4,  name: "Test Vier",   householdCode: "SANA0002" },
  { num: 5,  name: "Test Fuenf",  householdCode: "SANA0004" },
  { num: 6,  name: "Test Sechs",  householdCode: "SANA0006" },
  { num: 7,  name: "Test Sieben", householdCode: "REBB0009" },
  { num: 8,  name: "Test Acht",   householdCode: "REBB0011" },
  { num: 9,  name: "Test Neun",   householdCode: "REBB0013" },
  { num: 10, name: "Test Zehn",   householdCode: "REBB0015" },
];

// SICHERHEIT: Passwort aus Umgebungsvariable laden (nicht hardcoden!)
const PASSWORD = process.env.TEST_USER_PASSWORD;
if (!PASSWORD) {
  console.error("\n❌ TEST_USER_PASSWORD nicht gesetzt!");
  console.error("   Ausfuehrung: TEST_USER_PASSWORD=MeinPasswort npx tsx scripts/create-test-users.ts\n");
  process.exit(1);
}

async function main() {
  console.log("\n🏘️  Nachbar.io — Test-Accounts erstellen\n");
  console.log("━".repeat(55));

  // Alle Households laden fuer Code → ID Mapping
  const { data: households } = await supabase
    .from("households")
    .select("id, invite_code, street_name, house_number");

  if (!households || households.length === 0) {
    console.error("❌ Keine Haushalte in der Datenbank gefunden.");
    console.error("   Bitte zuerst die Migrationen und Seed-Daten ausfuehren.");
    process.exit(1);
  }

  const codeToHousehold = new Map(
    households.map((h) => [h.invite_code, h])
  );

  let created = 0;
  let skipped = 0;

  for (const user of TEST_USERS) {
    const email = `test${user.num}@nachbar.io`;
    const household = codeToHousehold.get(user.householdCode);

    if (!household) {
      console.log(`⚠️  Haushalt ${user.householdCode} nicht gefunden — uebersprungen`);
      skipped++;
      continue;
    }

    // 1. Supabase Auth User erstellen
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true, // Sofort bestaetigt, keine E-Mail noetig
    });

    if (authError) {
      if (authError.message.includes("already been registered")) {
        console.log(`⏭️  ${user.name} (${email}) — existiert bereits`);
        skipped++;
        continue;
      }
      console.error(`❌ ${user.name}: ${authError.message}`);
      continue;
    }

    const userId = authData.user.id;

    // 2. Profil in users-Tabelle anlegen
    const { error: profileError } = await supabase.from("users").upsert({
      id: userId,
      email_hash: "",
      display_name: user.name,
      avatar_url: null,
      ui_mode: "active",
      trust_level: "verified",
      is_admin: false,
    });

    if (profileError) {
      console.error(`❌ Profil ${user.name}: ${profileError.message}`);
      continue;
    }

    // 3. Haushalt-Mitgliedschaft anlegen
    const { error: memberError } = await supabase.from("household_members").upsert({
      household_id: household.id,
      user_id: userId,
      role: "member",
      verified_at: new Date().toISOString(),
    });

    if (memberError) {
      console.error(`❌ Mitgliedschaft ${user.name}: ${memberError.message}`);
      continue;
    }

    console.log(
      `✅ ${user.name.padEnd(12)} → ${email.padEnd(22)} → ${household.street_name} ${household.house_number}`
    );
    created++;
  }

  console.log("━".repeat(55));
  console.log(`\n📊 Ergebnis: ${created} erstellt, ${skipped} übersprungen\n`);

  if (created > 0) {
    console.log("🔑 Login-Daten für alle Test-Accounts:");
    console.log("━".repeat(55));
    console.log(`   Passwort:  ${PASSWORD}`);
    console.log(`   URL:       https://nachbar-io.vercel.app/login`);
    console.log("");
    for (const user of TEST_USERS) {
      console.log(`   test${user.num}@nachbar.io  →  ${user.name}`);
    }
    console.log("");
  }
}

main().catch(console.error);
