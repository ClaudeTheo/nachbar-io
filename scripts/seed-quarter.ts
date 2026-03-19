#!/usr/bin/env npx tsx
// scripts/seed-quarter.ts
// Content-Seeding fuer neue Quartiere
// Usage: npm run seed:quarter -- --quarter=bad-saeckingen
//
// Erstellt Beispielinhalt: Board-Posts, Dienstleister, Events, News, Willkommen
// Idempotent: Prueft ob bereits geseedet (via metadata-Flag in quarters)

import { createClient } from '@supabase/supabase-js';

// ============================================================
// Konfiguration
// ============================================================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Fehler: NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY muessen gesetzt sein.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================
// Seed-Daten
// ============================================================
const BOARD_POSTS = [
  { title: 'Willkommen im Quartier!', content: 'Herzlich willkommen in unserer digitalen Nachbarschaft. Hier können Sie sich mit Ihren Nachbarn vernetzen, Hilfe anbieten oder suchen, und über Neuigkeiten im Quartier auf dem Laufenden bleiben.', category: 'general' },
  { title: 'Hilfe beim Einkaufen angeboten', content: 'Ich fahre jeden Dienstag und Freitag zum Edeka. Wer möchte, kann mir eine Einkaufsliste geben — ich bringe es gerne mit.', category: 'help_offered' },
  { title: 'Suche Hilfe beim Rasenmähen', content: 'Kann mir jemand diese Woche beim Rasenmähen helfen? Mein Rasenmäher ist leider kaputt. Vielen Dank!', category: 'help_wanted' },
  { title: 'Babysitter gesucht', content: 'Suche zuverlässige/n Babysitter/in für Samstag Abend (18-22 Uhr). Zwei Kinder, 4 und 6 Jahre. Bitte melden!', category: 'help_wanted' },
  { title: 'Frische Äpfel vom Garten', content: 'Habe zu viele Äpfel im Garten. Wer mag, kann gerne vorbeikommen und sich bedienen. Purkersdorfer Straße.', category: 'general' },
  { title: 'Paketannahme möglich', content: 'Bin tagsüber meistens zu Hause und nehme gerne Pakete für Nachbarn an. Einfach kurz Bescheid geben!', category: 'help_offered' },
  { title: 'Fundstück: Schlüsselbund', content: 'Habe heute Morgen einen Schlüsselbund auf dem Gehweg gefunden (Sanarystraße, Höhe Nr. 12). Wem gehört er?', category: 'general' },
  { title: 'Lärmbelästigung Baustelle', content: 'Weiß jemand, wie lange die Baustelle an der Ecke noch dauert? Der Lärm ab 7 Uhr morgens ist schon heftig.', category: 'general' },
  { title: 'Gemüse vom Wochenmarkt teilen', content: 'Kaufe immer zu viel auf dem Wochenmarkt. Wer mag, kann sich Tomaten, Zucchini und Salat abholen.', category: 'help_offered' },
  { title: 'Gartenmöbel zu verschenken', content: 'Zwei Gartenstühle und ein kleiner Tisch, gut erhalten. Abholung ab sofort. Oberer Rebberg.', category: 'marketplace' },
  { title: 'Fahrgemeinschaft zum Bahnhof?', content: 'Fahre jeden Morgen um 7:15 Uhr zum Bahnhof. Wer möchte mitfahren? Kostenlos, spare mir das alleine Fahren.', category: 'general' },
  { title: 'Lesegruppe gründen?', content: 'Hätte jemand Interesse an einer monatlichen Lesegruppe? Wir könnten uns abwechselnd bei jemandem zu Hause treffen.', category: 'general' },
  { title: 'Katze zugelaufen', content: 'Seit gestern streunt eine graue Katze mit weißen Pfoten um unser Haus. Wem gehört sie?', category: 'general' },
  { title: 'Werkzeug zum Ausleihen', content: 'Habe eine Bohrmaschine, Stichsäge und Schlagbohrer. Kann gerne ausgeliehen werden. Einfach melden!', category: 'help_offered' },
  { title: 'Nachbarschafts-Flohmarkt', content: 'Wer hätte Lust auf einen Flohmarkt im Quartier? Jeder stellt einen Tisch vor die Tür. Termin: nächster Samstag?', category: 'general' },
];

const BUSINESSES = [
  { name: 'Bäckerei Schmid', description: 'Frisches Brot und Gebäck seit 1978. Täglich frisch gebacken.', category: 'bakery', phone: '+49 7761 12345', address: 'Basler Straße 22' },
  { name: 'Apotheke am Markt', description: 'Ihre freundliche Apotheke mit Lieferdienst für Senioren.', category: 'pharmacy', phone: '+49 7761 23456', address: 'Marktplatz 5' },
  { name: 'Blumen Müller', description: 'Blumensträuße, Topfpflanzen und Grabgestecke.', category: 'florist', phone: '+49 7761 34567', address: 'Rheinstraße 14' },
  { name: 'Hausarztpraxis Dr. Weber', description: 'Allgemeinmedizin, Vorsorge, Hausbesuche.', category: 'doctor', phone: '+49 7761 45678', address: 'Schützenstraße 8' },
  { name: 'Metzgerei Hofmann', description: 'Fleisch und Wurst aus regionaler Tierhaltung.', category: 'butcher', phone: '+49 7761 56789', address: 'Laufenburger Straße 3' },
  { name: 'Friseur Haargenau', description: 'Damen, Herren und Kinder. Termine auch samstags.', category: 'hairdresser', phone: '+49 7761 67890', address: 'Steinbrückstraße 11' },
  { name: 'Schlüsseldienst Keller', description: 'Schlüssel nachmachen, Schlösser reparieren. 24h Notdienst.', category: 'locksmith', phone: '+49 7761 78901', address: 'Münsterplatz 2' },
  { name: 'Edeka Fröhlich', description: 'Lebensmittel, Getränke, Haushaltswaren. Lieferservice möglich.', category: 'supermarket', phone: '+49 7761 89012', address: 'Waldshuter Straße 17' },
];

const EVENTS = [
  { title: 'Quartierstreff Kaffee & Kuchen', description: 'Gemütliches Beisammensein bei Kaffee und selbstgebackenem Kuchen. Jeder ist willkommen!', date_offset_days: 7, location: 'Gemeinschaftsraum Purkersdorfer Str.' },
  { title: 'Gemeinsamer Spaziergang am Rhein', description: 'Wir treffen uns für einen entspannten Spaziergang am Rheinufer. Ca. 1 Stunde, barrierefrei.', date_offset_days: 14, location: 'Rheinbrücke (deutscher Seite)' },
  { title: 'Nachbarschafts-Stammtisch', description: 'Monatlicher Stammtisch zum Kennenlernen und Austauschen. Alle Nachbarn willkommen!', date_offset_days: 21, location: 'Gasthaus zum Löwen' },
];

const NEWS = [
  { title: 'Neue Sitzbank am Rebberg aufgestellt', summary: 'Die Stadt hat eine neue Sitzbank mit Aussicht auf den Rhein aufgestellt. Perfekt für eine Pause beim Spaziergang.' },
  { title: 'Straßenlaterne Sanarystraße repariert', summary: 'Die defekte Straßenlaterne an der Ecke Sanarystraße/Rebbergweg wurde gestern endlich repariert.' },
  { title: 'Müllabfuhr-Termine geändert', summary: 'Ab nächster Woche werden Gelber Sack und Biomüll einen Tag früher abgeholt. Neuer Kalender liegt im Rathaus aus.' },
  { title: 'Spielplatz bekommt neues Klettergerüst', summary: 'Der Spielplatz am Oberen Rebberg wird nächste Woche um ein neues Klettergerüst erweitert.' },
  { title: 'Achtung Glatteis in den Morgenstunden', summary: 'Die Wettervorhersage warnt vor Glätte in den nächsten Tagen. Bitte Vorsicht auf Gehwegen!' },
];

// ============================================================
// Hauptfunktion
// ============================================================
async function seedQuarter(quarterSlug: string) {
  console.log(`\n🌱 Seeding Quartier: ${quarterSlug}\n`);

  // Quartier finden
  const { data: quarter, error: qErr } = await supabase
    .from('quarters')
    .select('id, name')
    .or(`name.ilike.%${quarterSlug}%,slug.eq.${quarterSlug}`)
    .limit(1)
    .maybeSingle();

  if (qErr || !quarter) {
    console.error(`Quartier "${quarterSlug}" nicht gefunden.`);
    process.exit(1);
  }

  console.log(`Quartier gefunden: ${quarter.name} (${quarter.id})`);

  // Idempotenz pruefen: Gibt es schon genug Board-Posts?
  const { count: existingPosts } = await supabase
    .from('board_posts')
    .select('id', { count: 'exact', head: true })
    .eq('quarter_id', quarter.id);

  if ((existingPosts ?? 0) >= 10) {
    console.log(`⚠️  Quartier "${quarter.name}" hat bereits ${existingPosts} Posts. Seeding nicht nötig.`);
    return;
  }

  // System-User finden oder erstellen (fuer automatische Posts)
  const { data: systemUser } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'admin')
    .limit(1)
    .maybeSingle();

  if (!systemUser) {
    console.error('Kein Admin-User gefunden. Bitte zuerst einen Admin anlegen.');
    process.exit(1);
  }

  const systemUserId = systemUser.id;
  let created = 0;

  // 1. Board-Posts erstellen
  console.log('\n📋 Board-Posts...');
  for (const post of BOARD_POSTS) {
    const { error } = await supabase.from('board_posts').insert({
      user_id: systemUserId,
      quarter_id: quarter.id,
      title: post.title,
      content: post.content,
      category: post.category,
      created_at: randomPastDate(30),
    });
    if (error) {
      console.warn(`  ⚠️  Post "${post.title}": ${error.message}`);
    } else {
      created++;
      console.log(`  ✓ ${post.title}`);
    }
  }

  // 2. Dienstleister erstellen
  console.log('\n🏪 Dienstleister...');
  for (const biz of BUSINESSES) {
    const { error } = await supabase.from('businesses').insert({
      name: biz.name,
      description: biz.description,
      category: biz.category,
      phone: biz.phone,
      address: biz.address,
      quarter_id: quarter.id,
      verified: true,
      created_at: randomPastDate(60),
    });
    if (error) {
      console.warn(`  ⚠️  Dienstleister "${biz.name}": ${error.message}`);
    } else {
      created++;
      console.log(`  ✓ ${biz.name}`);
    }
  }

  // 3. Events erstellen
  console.log('\n📅 Events...');
  for (const event of EVENTS) {
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + event.date_offset_days);

    const { error } = await supabase.from('events').insert({
      title: event.title,
      description: event.description,
      event_date: eventDate.toISOString(),
      location: event.location,
      quarter_id: quarter.id,
      created_by: systemUserId,
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.warn(`  ⚠️  Event "${event.title}": ${error.message}`);
    } else {
      created++;
      console.log(`  ✓ ${event.title}`);
    }
  }

  // 4. News erstellen
  console.log('\n📰 Quartier-News...');
  for (const news of NEWS) {
    const { error } = await supabase.from('news').insert({
      title: news.title,
      summary: news.summary,
      quarter_id: quarter.id,
      source: 'seed',
      created_at: randomPastDate(14),
    });
    if (error) {
      console.warn(`  ⚠️  News "${news.title}": ${error.message}`);
    } else {
      created++;
      console.log(`  ✓ ${news.title}`);
    }
  }

  console.log(`\n✅ Seeding abgeschlossen: ${created} Einträge erstellt.\n`);
}

// Hilfsfunktion: Zufaelliges Datum in den letzten X Tagen
function randomPastDate(maxDaysAgo: number): string {
  const daysAgo = Math.floor(Math.random() * maxDaysAgo);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(Math.floor(Math.random() * 12) + 8); // 8-20 Uhr
  return date.toISOString();
}

// ============================================================
// CLI-Einstiegspunkt
// ============================================================
const args = process.argv.slice(2);
const quarterArg = args.find(a => a.startsWith('--quarter='));
const quarterSlug = quarterArg?.split('=')[1];

if (!quarterSlug) {
  console.error('Usage: npm run seed:quarter -- --quarter=bad-saeckingen');
  process.exit(1);
}

seedQuarter(quarterSlug).catch(err => {
  console.error('Seeding fehlgeschlagen:', err);
  process.exit(1);
});
