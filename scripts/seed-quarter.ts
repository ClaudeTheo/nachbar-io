#!/usr/bin/env npx tsx
// scripts/seed-quarter.ts
// Content-Seeding fuer neue Quartiere
// Usage: npm run seed:quarter -- --quarter=bad-saeckingen
//
// Erstellt Beispielinhalt: Schwarzes Brett (help_requests), Events, Quartier-News.
// Idempotent: Prueft ob bereits genug Board-Beitraege existieren.

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
// Schwarzes Brett: help_requests mit type='offer', category='board'. Der ganze
// Beitragstext steht im Feld title (so liest ihn app/(app)/board/page.tsx).
const BOARD_MESSAGES = [
  'Herzlich willkommen in unserer digitalen Nachbarschaft. Hier können Sie sich mit Ihren Nachbarn vernetzen, Hilfe anbieten oder suchen, und über Neuigkeiten im Quartier auf dem Laufenden bleiben.',
  'Ich fahre jeden Dienstag und Freitag zum Edeka. Wer möchte, kann mir eine Einkaufsliste geben — ich bringe es gerne mit.',
  'Kann mir jemand diese Woche beim Rasenmähen helfen? Mein Rasenmäher ist leider kaputt. Vielen Dank!',
  'Suche zuverlässige Betreuung für Samstag Abend (18-22 Uhr). Zwei Kinder, 4 und 6 Jahre. Bitte melden!',
  'Habe zu viele Äpfel im Garten. Wer mag, kann gerne vorbeikommen und sich bedienen. Purkersdorfer Straße.',
  'Bin tagsüber meistens zu Hause und nehme gerne Pakete für Nachbarn an. Einfach kurz Bescheid geben!',
  'Habe heute Morgen einen Schlüsselbund auf dem Gehweg gefunden (Sanarystraße, Höhe Nr. 12). Wem gehört er?',
  'Weiß jemand, wie lange die Baustelle an der Ecke noch dauert? Der Lärm ab 7 Uhr morgens ist schon heftig.',
  'Kaufe immer zu viel auf dem Wochenmarkt. Wer mag, kann sich Tomaten, Zucchini und Salat abholen.',
  'Zwei Gartenstühle und ein kleiner Tisch, gut erhalten, zu verschenken. Abholung ab sofort. Oberer Rebberg.',
  'Fahre jeden Morgen um 7:15 Uhr zum Bahnhof. Wer möchte mitfahren? Kostenlos, spare mir das alleine Fahren.',
  'Hätte jemand Interesse an einer monatlichen Lesegruppe? Wir könnten uns abwechselnd bei jemandem zu Hause treffen.',
  'Seit gestern streunt eine graue Katze mit weißen Pfoten um unser Haus. Wem gehört sie?',
  'Habe eine Bohrmaschine, Stichsäge und Schlagbohrer zum Ausleihen. Einfach melden!',
  'Wer hätte Lust auf einen Flohmarkt im Quartier? Jeder stellt einen Tisch vor die Tür. Termin: nächster Samstag?',
];

const EVENTS = [
  { title: 'Quartierstreff Kaffee & Kuchen', description: 'Gemütliches Beisammensein bei Kaffee und selbstgebackenem Kuchen. Jeder ist willkommen!', date_offset_days: 7, location: 'Gemeinschaftsraum Purkersdorfer Str.' },
  { title: 'Gemeinsamer Spaziergang am Rhein', description: 'Wir treffen uns für einen entspannten Spaziergang am Rheinufer. Ca. 1 Stunde, barrierefrei.', date_offset_days: 14, location: 'Rheinbrücke (deutscher Seite)' },
  { title: 'Nachbarschafts-Stammtisch', description: 'Monatlicher Stammtisch zum Kennenlernen und Austauschen. Alle Nachbarn willkommen!', date_offset_days: 21, location: 'Gasthaus zum Löwen' },
];

// Quartier-News: news_items (kein User-FK). category muss aus dem festen Set
// stammen: infrastructure | events | administration | weather | waste | other.
const NEWS = [
  { title: 'Neue Sitzbank am Rebberg aufgestellt', summary: 'Die Stadt hat eine neue Sitzbank mit Aussicht auf den Rhein aufgestellt. Perfekt für eine Pause beim Spaziergang.', category: 'infrastructure' },
  { title: 'Straßenlaterne Sanarystraße repariert', summary: 'Die defekte Straßenlaterne an der Ecke Sanarystraße/Rebbergweg wurde gestern endlich repariert.', category: 'infrastructure' },
  { title: 'Müllabfuhr-Termine geändert', summary: 'Ab nächster Woche werden Gelber Sack und Biomüll einen Tag früher abgeholt. Neuer Kalender liegt im Rathaus aus.', category: 'waste' },
  { title: 'Spielplatz bekommt neues Klettergerüst', summary: 'Der Spielplatz am Oberen Rebberg wird nächste Woche um ein neues Klettergerüst erweitert.', category: 'infrastructure' },
  { title: 'Achtung Glatteis in den Morgenstunden', summary: 'Die Wettervorhersage warnt vor Glätte in den nächsten Tagen. Bitte Vorsicht auf Gehwegen!', category: 'weather' },
];

// ============================================================
// Hauptfunktion
// ============================================================
async function seedQuarter(quarterSlug: string, authorId?: string) {
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

  // Idempotenz pruefen: Gibt es schon genug Board-Beitraege?
  const { count: existingPosts } = await supabase
    .from('help_requests')
    .select('id', { count: 'exact', head: true })
    .eq('quarter_id', quarter.id)
    .eq('category', 'board');

  if ((existingPosts ?? 0) >= 10) {
    console.log(`⚠️  Quartier "${quarter.name}" hat bereits ${existingPosts} Board-Beitraege. Seeding nicht nötig.`);
    return;
  }

  // Autor der Beispiel-Posts: explizit per --author-id (z. B. Demo-User),
  // sonst wie bisher der erste Admin-User.
  let systemUserId: string;
  if (authorId) {
    const { data: author, error: aErr } = await supabase
      .from('users')
      .select('id')
      .eq('id', authorId)
      .maybeSingle();
    if (aErr || !author) {
      console.error(`Autor-User ${authorId} nicht gefunden.`);
      process.exit(1);
    }
    systemUserId = author.id;
    console.log(`Autor: ${systemUserId} (per --author-id)`);
  } else {
    const { data: systemUser } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle();

    if (!systemUser) {
      console.error('Kein Admin-User gefunden. Bitte zuerst einen Admin anlegen oder --author-id=<uuid> uebergeben.');
      process.exit(1);
    }
    systemUserId = systemUser.id;
  }
  let created = 0;

  // 1. Board-Beitraege (Schwarzes Brett) erstellen
  console.log('\n📋 Schwarzes Brett...');
  for (const message of BOARD_MESSAGES) {
    const { error } = await supabase.from('help_requests').insert({
      user_id: systemUserId,
      quarter_id: quarter.id,
      type: 'offer',
      category: 'board',
      title: message,
      description: null,
      status: 'active',
      created_at: randomPastDate(30),
    });
    if (error) {
      console.warn(`  ⚠️  Beitrag: ${error.message}`);
    } else {
      created++;
      console.log(`  ✓ ${message.slice(0, 50)}…`);
    }
  }

  // 2. Events erstellen
  console.log('\n📅 Events...');
  for (const event of EVENTS) {
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + event.date_offset_days);

    const { error } = await supabase.from('events').insert({
      user_id: systemUserId,
      quarter_id: quarter.id,
      title: event.title,
      description: event.description,
      // events.event_date ist eine DATE-Spalte -> nur YYYY-MM-DD, kein Timestamp.
      event_date: eventDate.toISOString().slice(0, 10),
      location: event.location,
    });
    if (error) {
      console.warn(`  ⚠️  Event "${event.title}": ${error.message}`);
    } else {
      created++;
      console.log(`  ✓ ${event.title}`);
    }
  }

  // 3. Quartier-News erstellen
  console.log('\n📰 Quartier-News...');
  for (const news of NEWS) {
    const { error } = await supabase.from('news_items').insert({
      original_title: news.title,
      ai_summary: news.summary,
      category: news.category,
      quarter_id: quarter.id,
      published_at: randomPastDate(14),
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
const authorArg = args.find(a => a.startsWith('--author-id='));
const authorId = authorArg?.split('=')[1];

if (!quarterSlug) {
  console.error('Usage: npm run seed:quarter -- --quarter=bad-saeckingen [--author-id=<uuid>]');
  process.exit(1);
}

seedQuarter(quarterSlug, authorId).catch(err => {
  console.error('Seeding fehlgeschlagen:', err);
  process.exit(1);
});
