#!/usr/bin/env npx tsx
// scripts/seed-demo-quarter.ts
// Demo-Daten fuer Apple App Store Review
// Usage: npx tsx scripts/seed-demo-quarter.ts
//
// Erstellt:
// - Demo-Account (review@quartierapp.de) mit Invite-Code DEMO-REVIEW
// - 10 Board-Posts, 5 Marktplatz-Anzeigen, 3 Events
// - Idempotent: Prueft ob Demo-Account bereits existiert

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Fehler: NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY muessen gesetzt sein.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DEMO_EMAIL = 'review@quartierapp.de';
const DEMO_PASSWORD = 'QuartierReview2026!';
const DEMO_INVITE_CODE = 'DEMO-REVIEW';

// Realistische Board-Posts fuer Bad Saeckingen
const DEMO_POSTS = [
  { title: 'Straßenflohmarkt am Samstag!', content: 'Liebe Nachbarn, am kommenden Samstag (10-16 Uhr) veranstalten wir einen Straßenflohmarkt in der Purkersdorfer Straße. Jeder kann einen Tisch vor die Tür stellen. Bitte gebt kurz Bescheid wer mitmacht!', category: 'general' },
  { title: 'Paketannahme angeboten', content: 'Bin tagsüber meistens zu Hause (Homeoffice) und nehme gerne Pakete für Nachbarn an. Einfach bei mir klingeln oder kurz anrufen.', category: 'help_offered' },
  { title: 'Suche Hilfe beim Umzug', content: 'Ziehe nächste Woche in die Sanarystraße und brauche 2-3 kräftige Hände zum Tragen. Kann mit Kuchen und Getränken danken!', category: 'help_wanted' },
  { title: 'Fundstück: Kinderfahrrad', content: 'Habe ein blaues Kinderfahrrad (ca. 20 Zoll) am Spielplatz gefunden. Steht bei mir im Hof. Wem gehört es?', category: 'general' },
  { title: 'Gemeinsames Gärtnern', content: 'Wer hat Lust, das Hochbeet vor dem Gemeinschaftsraum neu zu bepflanzen? Habe Erde und Setzlinge. Samstag 10 Uhr?', category: 'general' },
  { title: 'Einkaufsfahrt zum Edeka', content: 'Fahre jeden Mittwoch und Samstag zum Edeka. Wer möchte mitfahren oder mir eine Einkaufsliste geben? Gerne melden!', category: 'help_offered' },
  { title: 'Hundesitter gesucht', content: 'Bin vom 15.-20. auf Geschäftsreise. Wer könnte auf meinen Labrador Max aufpassen? Er ist lieb und gut erzogen.', category: 'help_wanted' },
  { title: 'Achtung: Straßensperrung', content: 'Ab Montag wird die Sanarystraße wegen Kanalarbeiten teilweise gesperrt. Dauer: ca. 2 Wochen. Umleitung über Rebbergweg.', category: 'general' },
  { title: 'Yoga im Park — jeden Dienstag', content: 'Biete kostenlose Yoga-Stunde im Park an. Dienstags, 18 Uhr am Rheinufer. Bitte eigene Matte mitbringen. Anfänger willkommen!', category: 'general' },
  { title: 'Nachbarschaftshilfe für Senioren', content: 'Ich helfe älteren Nachbarn gerne bei kleinen Reparaturen, Glühbirnen wechseln, etc. Einfach über die App melden.', category: 'help_offered' },
];

// Marktplatz-Anzeigen
const DEMO_MARKETPLACE = [
  { title: 'Fahrrad zu verkaufen', description: 'Damenrad, 28 Zoll, 7-Gang Shimano, gut erhalten. Nur Abholung.', price: 85, category: 'vehicles' },
  { title: 'Bücherregal (Billy, weiß)', description: 'IKEA Billy Regal, 80x200cm, weiß, sehr guter Zustand. Muss selbst abgebaut werden.', price: 25, category: 'furniture' },
  { title: 'Babykleidung Paket (6-12M)', description: 'Großes Paket mit Bodies, Stramplern, Mützen. Alles gewaschen und in gutem Zustand.', price: 15, category: 'clothing' },
  { title: 'Rasenmäher Bosch Rotak', description: 'Elektro-Rasenmäher, 40cm Schnittbreite, funktioniert einwandfrei. Nur Abholung.', price: 45, category: 'garden' },
  { title: 'Kaffeemaschine De Longhi', description: 'Vollautomatische Kaffeemaschine, frisch entkalkt, mit Milchschäumer. NP 400€.', price: 120, category: 'electronics' },
];

// Events
const DEMO_EVENTS = [
  { title: 'Quartiertreffen & Kennenlernabend', description: 'Gemütliches Beisammensein zum Kennenlernen. Jeder bringt etwas Kleines mit (Kuchen, Salat, Getränk).', date_offset_days: 10, location: 'Gemeinschaftsraum Purkersdorfer Str. 14' },
  { title: 'Repair-Café im Quartier', description: 'Bringen Sie defekte Geräte mit — unsere ehrenamtlichen Reparateure helfen kostenlos. Toaster, Lampen, Fahrräder...', date_offset_days: 17, location: 'Werkstatt Oberer Rebberg' },
  { title: 'Gemeinsamer Spaziergang am Rhein', description: 'Sonntagsspaziergang am Rheinufer. Ca. 1 Stunde, gemütliches Tempo, barrierefrei. Danach optional Einkehr.', date_offset_days: 5, location: 'Treffpunkt Rheinbrücke (deutsche Seite)' },
];

async function seedDemo() {
  console.log('\n🍎 Apple App Store Review — Demo-Quartier Seeding\n');

  // 1. Quartier finden
  const { data: quarter, error: qErr } = await supabase
    .from('quarters')
    .select('id, name')
    .or('name.ilike.%bad%,name.ilike.%saeck%')
    .limit(1)
    .maybeSingle();

  if (qErr || !quarter) {
    console.error('Quartier Bad Saeckingen nicht gefunden.');
    process.exit(1);
  }
  console.log(`Quartier: ${quarter.name} (${quarter.id})`);

  // 2. Demo-Account pruefen/erstellen
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', DEMO_EMAIL)
    .maybeSingle();

  let demoUserId: string;

  if (existingUser) {
    demoUserId = existingUser.id;
    console.log(`Demo-Account existiert bereits: ${demoUserId}`);
  } else {
    // Neuen Demo-User via Auth erstellen
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });

    if (authErr || !authUser.user) {
      console.error('Demo-Account konnte nicht erstellt werden:', authErr?.message);
      process.exit(1);
    }

    demoUserId = authUser.user.id;

    // Profil in users-Tabelle
    const { error: profileErr } = await supabase.from('users').upsert({
      id: demoUserId,
      email: DEMO_EMAIL,
      first_name: 'App Store',
      last_name: 'Reviewer',
      quarter_id: quarter.id,
      role: 'resident',
      verified: true,
    });

    if (profileErr) {
      console.warn('Profil-Erstellung:', profileErr.message);
    }

    console.log(`Demo-Account erstellt: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  }

  // 3. Admin-User fuer System-Posts
  const { data: adminUser } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'admin')
    .limit(1)
    .maybeSingle();

  const postUserId = adminUser?.id || demoUserId;
  let created = 0;

  // 4. Board-Posts
  console.log('\n📋 Board-Posts...');
  for (const post of DEMO_POSTS) {
    const { error } = await supabase.from('board_posts').insert({
      user_id: postUserId,
      quarter_id: quarter.id,
      title: post.title,
      content: post.content,
      category: post.category,
      created_at: randomPastDate(21),
    });
    if (error) {
      console.warn(`  ⚠️  ${post.title}: ${error.message}`);
    } else {
      created++;
      console.log(`  ✓ ${post.title}`);
    }
  }

  // 5. Marktplatz
  console.log('\n🛒 Marktplatz-Anzeigen...');
  for (const item of DEMO_MARKETPLACE) {
    const { error } = await supabase.from('marketplace_listings').insert({
      user_id: postUserId,
      quarter_id: quarter.id,
      title: item.title,
      description: item.description,
      price: item.price,
      category: item.category,
      status: 'active',
      created_at: randomPastDate(14),
    });
    if (error) {
      console.warn(`  ⚠️  ${item.title}: ${error.message}`);
    } else {
      created++;
      console.log(`  ✓ ${item.title} (${item.price}€)`);
    }
  }

  // 6. Events
  console.log('\n📅 Events...');
  for (const event of DEMO_EVENTS) {
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + event.date_offset_days);
    eventDate.setHours(18, 0, 0, 0);

    const { error } = await supabase.from('events').insert({
      title: event.title,
      description: event.description,
      event_date: eventDate.toISOString(),
      location: event.location,
      quarter_id: quarter.id,
      created_by: postUserId,
    });
    if (error) {
      console.warn(`  ⚠️  ${event.title}: ${error.message}`);
    } else {
      created++;
      console.log(`  ✓ ${event.title}`);
    }
  }

  console.log(`\n✅ Demo-Seeding abgeschlossen: ${created} Einträge erstellt.`);
  console.log(`\n📱 App Store Review Login:`);
  console.log(`   E-Mail:    ${DEMO_EMAIL}`);
  console.log(`   Passwort:  ${DEMO_PASSWORD}`);
  console.log(`   Invite:    ${DEMO_INVITE_CODE}\n`);
}

function randomPastDate(maxDaysAgo: number): string {
  const daysAgo = Math.floor(Math.random() * maxDaysAgo) + 1;
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(Math.floor(Math.random() * 12) + 8);
  return date.toISOString();
}

seedDemo().catch(err => {
  console.error('Demo-Seeding fehlgeschlagen:', err);
  process.exit(1);
});
