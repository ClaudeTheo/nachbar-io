// lib/care/channels/push.ts
// Web Push Kanal — nutzt bestehendes Push-System

import type { SupabaseClient } from '@supabase/supabase-js';

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Sendet Web Push Benachrichtigung an einen User.
 * Nutzt die bestehende push_subscriptions Tabelle + /api/push/send.
 */
export async function sendPush(
  supabase: SupabaseClient,
  payload: PushPayload
): Promise<boolean> {
  try {
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', payload.userId);

    if (!subscriptions?.length) {
      console.warn(`[care/push] Keine Push-Subscription fuer User ${payload.userId}`);
      return false;
    }

    // Sende an alle registrierten Endpunkte des Users
    // Absoluter URL fuer serverseitige Aufrufe (relative URLs funktionieren nicht in Node.js)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quartierapp.de';
    const response = await fetch(`${baseUrl}/api/push/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': process.env.INTERNAL_API_SECRET || '',
      },
      body: JSON.stringify({
        userId: payload.userId,
        title: payload.title,
        body: payload.body,
        url: payload.url,
        tag: payload.tag,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('[care/push] Fehler:', error);
    return false;
  }
}
