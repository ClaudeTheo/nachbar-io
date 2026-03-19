// lib/welcome-pack.ts
// Neuzuezuegler-Willkommens-Paket
// Trigger: 1h nach Registrierung (via Cron)
// Aktionen: Push + Board-Post + Top-Events anzeigen
// Einmalig pro User, personalisiert, kein Spam

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Prueft ob ein Nutzer sein Willkommenspaket bereits erhalten hat.
 */
export async function hasReceivedWelcomePack(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', 'welcome_pack');

  return (count ?? 0) > 0;
}

/**
 * Sendet das Willkommenspaket an einen neuen Nutzer.
 * Wird vom Cron-Job aufgerufen.
 */
export async function sendWelcomePack(
  supabase: SupabaseClient,
  userId: string,
  quarterId: string,
  displayName: string
): Promise<{ sent: boolean; reason?: string }> {
  // Idempotenz: Bereits erhalten?
  const received = await hasReceivedWelcomePack(supabase, userId);
  if (received) {
    return { sent: false, reason: 'already_received' };
  }

  // 1. Willkommens-Benachrichtigung
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'welcome_pack',
    title: 'Willkommen im Quartier!',
    body: 'Schön, dass Sie dabei sind! Entdecken Sie Ihre Nachbarschaft: Schwarzes Brett, Events, Marktplatz und mehr.',
    reference_type: 'quarter',
    reference_id: quarterId,
  });

  // 2. Top-3-Events im Quartier laden (naechste 30 Tage)
  const { data: upcomingEvents } = await supabase
    .from('events')
    .select('id, title, event_date')
    .eq('quarter_id', quarterId)
    .gte('event_date', new Date().toISOString())
    .order('event_date', { ascending: true })
    .limit(3);

  if (upcomingEvents && upcomingEvents.length > 0) {
    const eventList = upcomingEvents
      .map(e => {
        const date = new Date(e.event_date);
        return `${e.title} (${date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })})`;
      })
      .join(', ');

    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'welcome_events',
      title: 'Kommende Events in Ihrem Quartier',
      body: eventList,
      reference_type: 'quarter',
      reference_id: quarterId,
    });
  }

  // 3. Automatischer Willkommens-Post auf dem Schwarzen Brett
  // Nur wenn Board aktiv ist und Nutzer zugestimmt hat
  // (Im Pilot: immer erstellen)
  await supabase.from('board_posts').insert({
    user_id: userId,
    quarter_id: quarterId,
    title: `${displayName} ist neu im Quartier`,
    content: `Herzlich willkommen! ${displayName} ist jetzt Teil unserer Nachbarschaft.`,
    category: 'general',
  });

  return { sent: true };
}

/**
 * Findet neue Nutzer die vor 1-2 Stunden registriert wurden
 * und noch kein Willkommenspaket erhalten haben.
 */
export async function findNewUsersForWelcomePack(
  supabase: SupabaseClient
): Promise<Array<{ id: string; display_name: string; quarter_id: string }>> {
  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString();

  // Nutzer die vor 1-2 Stunden erstellt wurden
  const { data: newUsers } = await supabase
    .from('users')
    .select('id, display_name')
    .gte('created_at', twoHoursAgo)
    .lte('created_at', oneHourAgo);

  if (!newUsers?.length) return [];

  const result: Array<{ id: string; display_name: string; quarter_id: string }> = [];

  for (const user of newUsers) {
    // Quartier ueber Haushalt ermitteln
    const { data: member } = await supabase
      .from('household_members')
      .select('household:households(quarter_id)')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    const household = member?.household as unknown as { quarter_id: string } | null;
    const quarterId = household?.quarter_id;
    if (!quarterId) continue;

    // Willkommenspaket schon erhalten?
    const received = await hasReceivedWelcomePack(supabase, user.id);
    if (received) continue;

    result.push({
      id: user.id,
      display_name: user.display_name,
      quarter_id: quarterId,
    });
  }

  return result;
}
