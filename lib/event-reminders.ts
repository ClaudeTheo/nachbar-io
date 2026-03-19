// lib/event-reminders.ts
// Event Push-Erinnerungen: 24h + 1h vor Event
// Dedup: Nur einmal pro Event pro User pro Erinnerungsstufe

import type { SupabaseClient } from '@supabase/supabase-js';
import { sendPush } from '@/lib/care/channels/push';
import { safeInsertNotification } from '@/lib/notifications-server';

export type ReminderLevel = '24h' | '1h';

export interface UpcomingEvent {
  id: string;
  title: string;
  event_date: string;
  event_time: string;
  quarter_id: string;
  location?: string;
}

interface EventParticipant {
  user_id: string;
  status: string;
}

// Stunden bis zum Event berechnen
export function getHoursUntilEvent(
  event: { event_date: string; event_time: string },
  now: Date
): number {
  const eventDateTime = new Date(`${event.event_date}T${event.event_time}:00`);
  return (eventDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
}

// Prueft ob fuer dieses Zeitfenster eine Erinnerung gesendet werden soll
// 24h-Erinnerung: 22-26h vor Event (Puffer fuer 15min-Cron)
// 1h-Erinnerung: 0.25-1.5h vor Event (Puffer fuer 15min-Cron)
export function shouldSendReminder(hoursUntil: number, level: ReminderLevel): boolean {
  if (hoursUntil < 0) return false;

  if (level === '24h') {
    return hoursUntil >= 22 && hoursUntil <= 26;
  }
  if (level === '1h') {
    return hoursUntil >= 0.25 && hoursUntil <= 1.5;
  }
  return false;
}

// Erinnerungs-Nachricht bauen
export function buildReminderMessage(
  title: string,
  eventDate: string,
  eventTime: string,
  level: ReminderLevel
): { title: string; body: string } {
  if (level === '24h') {
    return {
      title: `Morgen: ${title}`,
      body: `Erinnerung: "${title}" findet morgen um ${eventTime} Uhr statt.`,
    };
  }
  return {
    title: `In 1 Stunde: ${title}`,
    body: `"${title}" beginnt um ${eventTime} Uhr. Wir sehen uns dort!`,
  };
}

// Events laden die in den naechsten 26h stattfinden (deckt 24h + 1h Fenster ab)
export async function findUpcomingEvents(
  supabase: SupabaseClient,
  now: Date
): Promise<UpcomingEvent[]> {
  const tomorrow = new Date(now.getTime() + 26 * 60 * 60 * 1000);
  const todayStr = now.toISOString().split('T')[0];
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('events')
    .select('id, title, event_date, event_time, quarter_id, location')
    .gte('event_date', todayStr)
    .lte('event_date', tomorrowStr);

  if (error) {
    console.error('[event-reminders] Events laden fehlgeschlagen:', error.message);
    return [];
  }

  return (data ?? []) as UpcomingEvent[];
}

// RSVP-Teilnehmer laden (nur "going")
export async function getEventParticipants(
  supabase: SupabaseClient,
  eventId: string
): Promise<EventParticipant[]> {
  const { data, error } = await supabase
    .from('event_participants')
    .select('user_id, status')
    .eq('event_id', eventId)
    .eq('status', 'going');

  if (error) {
    console.error(`[event-reminders] Teilnehmer laden fuer ${eventId}:`, error.message);
    return [];
  }

  return (data ?? []) as EventParticipant[];
}

// Pruefen ob Erinnerung bereits gesendet wurde (Dedup via notifications)
export async function hasReminderBeenSent(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
  level: ReminderLevel
): Promise<boolean> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('reference_id', eventId)
    .eq('reference_type', `event_reminder_${level}`);

  if (error) return false;
  return (count ?? 0) > 0;
}

// Erinnerung senden (Push + In-App Notification)
export async function sendEventReminder(
  supabase: SupabaseClient,
  userId: string,
  event: UpcomingEvent,
  level: ReminderLevel
): Promise<boolean> {
  const msg = buildReminderMessage(event.title, event.event_date, event.event_time, level);

  // Push
  await sendPush(supabase, {
    userId,
    title: msg.title,
    body: msg.body,
    url: `/events/${event.id}`,
    tag: `event-reminder-${event.id}-${level}`,
  });

  // In-App Notification (mit Dedup-Reference)
  await safeInsertNotification(supabase, {
    user_id: userId,
    type: 'event_participation',
    title: msg.title,
    body: msg.body,
    reference_id: event.id,
    reference_type: `event_reminder_${level}`,
  });

  return true;
}

// Haupt-Funktion: Alle faelligen Erinnerungen verarbeiten
export async function processEventReminders(
  supabase: SupabaseClient
): Promise<{ sent: number; skipped: number; events: number }> {
  const now = new Date();
  const events = await findUpcomingEvents(supabase, now);
  let sent = 0;
  let skipped = 0;

  for (const event of events) {
    const hoursUntil = getHoursUntilEvent(event, now);
    const levels: ReminderLevel[] = ['24h', '1h'];

    for (const level of levels) {
      if (!shouldSendReminder(hoursUntil, level)) continue;

      const participants = await getEventParticipants(supabase, event.id);

      for (const participant of participants) {
        // Dedup: Wurde diese Erinnerung schon gesendet?
        const alreadySent = await hasReminderBeenSent(
          supabase, participant.user_id, event.id, level
        );

        if (alreadySent) {
          skipped++;
          continue;
        }

        await sendEventReminder(supabase, participant.user_id, event, level);
        sent++;
      }
    }
  }

  return { sent, skipped, events: events.length };
}
