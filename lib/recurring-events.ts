// lib/recurring-events.ts
// Wiederkehrende Events: naechste Instanz automatisch erstellen
// Cron-Job erstellt jeweils die naechste Instanz wenn die aktuelle vorbei ist

import type { SupabaseClient } from '@supabase/supabase-js';

export type RecurrenceRule = 'weekly' | 'biweekly' | 'monthly' | 'first_monday' | 'last_friday';

export const RECURRENCE_LABELS: Record<RecurrenceRule, string> = {
  weekly: 'Jede Woche',
  biweekly: 'Alle 2 Wochen',
  monthly: 'Jeden Monat',
  first_monday: 'Jeden 1. Montag',
  last_friday: 'Jeden letzten Freitag',
};

interface RecurringEvent {
  id: string;
  user_id: string;
  quarter_id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  event_time: string | null;
  end_time: string | null;
  category: string;
  max_participants: number | null;
  recurrence_rule: RecurrenceRule;
  recurrence_end_date: string | null;
  parent_event_id: string | null;
}

// Hilfsfunktion: Datum als YYYY-MM-DD formatieren (lokal, ohne Zeitzonenshift)
function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Naechstes Datum basierend auf Wiederholungsregel berechnen
export function calculateNextDate(currentDate: string, rule: RecurrenceRule): string {
  // Datum als lokale Mittagszeit parsen (verhindert Zeitzonenshift)
  const [year, month, day] = currentDate.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);

  switch (rule) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'first_monday': {
      // Naechster 1. Montag des Folgemonats
      date.setMonth(date.getMonth() + 1);
      date.setDate(1);
      while (date.getDay() !== 1) {
        date.setDate(date.getDate() + 1);
      }
      break;
    }
    case 'last_friday': {
      // Letzter Freitag des Folgemonats
      date.setMonth(date.getMonth() + 2);
      date.setDate(0); // Letzter Tag des Folgemonats
      while (date.getDay() !== 5) {
        date.setDate(date.getDate() - 1);
      }
      break;
    }
  }

  return formatDateLocal(date);
}

// Prueft ob die Wiederholung noch aktiv ist (Enddatum nicht ueberschritten)
export function isRecurrenceActive(
  nextDate: string,
  endDate: string | null
): boolean {
  if (!endDate) return true;
  return nextDate <= endDate;
}

// Prueft ob fuer ein Parent-Event bereits eine zukuenftige Instanz existiert
export async function hasUpcomingInstance(
  supabase: SupabaseClient,
  parentEventId: string,
  today: string
): Promise<boolean> {
  const { count } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('parent_event_id', parentEventId)
    .gte('event_date', today);

  return (count ?? 0) > 0;
}

// Erstellt die naechste Instanz eines wiederkehrenden Events
export async function createNextInstance(
  supabase: SupabaseClient,
  event: RecurringEvent
): Promise<{ created: boolean; nextDate?: string; error?: string }> {
  const nextDate = calculateNextDate(event.event_date, event.recurrence_rule);

  // Enddatum pruefen
  if (!isRecurrenceActive(nextDate, event.recurrence_end_date)) {
    return { created: false, error: 'Wiederholung abgelaufen' };
  }

  // Parent-ID: Wenn das Event selbst eine Instanz ist, Parent verwenden
  const parentId = event.parent_event_id ?? event.id;

  // Bereits existierende Instanz pruefen
  const today = new Date().toISOString().split('T')[0];
  const alreadyExists = await hasUpcomingInstance(supabase, parentId, today);
  if (alreadyExists) {
    return { created: false, error: 'Zukuenftige Instanz existiert bereits' };
  }

  const { error } = await supabase.from('events').insert({
    user_id: event.user_id,
    quarter_id: event.quarter_id,
    title: event.title,
    description: event.description,
    location: event.location,
    event_date: nextDate,
    event_time: event.event_time,
    end_time: event.end_time,
    category: event.category,
    max_participants: event.max_participants,
    recurrence_rule: event.recurrence_rule,
    recurrence_end_date: event.recurrence_end_date,
    parent_event_id: parentId,
  });

  if (error) {
    console.error(`[recurring-events] Instanz erstellen fehlgeschlagen:`, error.message);
    return { created: false, error: error.message };
  }

  return { created: true, nextDate };
}

// Haupt-Funktion: Alle faelligen wiederkehrenden Events verarbeiten
export async function processRecurringEvents(
  supabase: SupabaseClient
): Promise<{ created: number; skipped: number; total: number }> {
  const today = new Date().toISOString().split('T')[0];

  // Alle Events mit Wiederholungsregel deren Datum bereits vorbei ist
  const { data: events, error } = await supabase
    .from('events')
    .select('id, user_id, quarter_id, title, description, location, event_date, event_time, end_time, category, max_participants, recurrence_rule, recurrence_end_date, parent_event_id')
    .not('recurrence_rule', 'is', null)
    .lt('event_date', today);

  if (error) {
    console.error('[recurring-events] Events laden fehlgeschlagen:', error.message);
    return { created: 0, skipped: 0, total: 0 };
  }

  let created = 0;
  let skipped = 0;

  for (const event of events ?? []) {
    const result = await createNextInstance(supabase, event as RecurringEvent);
    if (result.created) {
      created++;
    } else {
      skipped++;
    }
  }

  return { created, skipped, total: (events ?? []).length };
}
