// lib/care/notifications.ts
// Multi-Channel Benachrichtigungs-Service fuer das Care-Modul
// Mit Fallback-Kaskade: Push -> SMS -> Voice

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CareNotificationType } from './types';
import { sendPush } from './channels/push';
import { sendSms } from './channels/sms';
import { initiateCall } from './channels/voice';
import { safeInsertNotification } from '@/lib/notifications-server';

/** Ergebnis einer Multi-Channel-Benachrichtigung */
export interface NotificationResult {
  in_app?: boolean;
  push?: boolean;
  sms?: boolean;
  voice?: boolean;
  admin_alert?: boolean;
  /** True wenn mindestens ein Echtzeit-Kanal (push/sms/voice) erfolgreich war */
  anyDelivered: boolean;
}

interface CareNotificationPayload {
  userId: string;
  type: CareNotificationType;
  title: string;
  body: string;
  referenceId?: string;
  referenceType?: string;
  url?: string;
  // Optionale Kontaktdaten fuer SMS/Anruf
  phone?: string;
  // Welche Kanaele sollen genutzt werden?
  channels: ('push' | 'in_app' | 'sms' | 'voice' | 'admin_alert')[];
  // Bei true: Wenn Push fehlschlaegt, automatisch SMS versuchen, dann Voice (Kaskade)
  enableFallback?: boolean;
}

/**
 * Sendet eine Benachrichtigung ueber alle angegebenen Kanaele.
 * Schreibt immer eine In-App-Notification, wenn 'in_app' in channels ist.
 *
 * Mit enableFallback=true wird eine Kaskade aktiviert:
 * Push fehlgeschlagen + Telefonnummer vorhanden -> SMS versuchen
 * SMS fehlgeschlagen + Telefonnummer vorhanden -> Voice versuchen
 */
export async function sendCareNotification(
  supabase: SupabaseClient,
  payload: CareNotificationPayload
): Promise<NotificationResult> {
  const results: Record<string, boolean> = {};
  const enableFallback = payload.enableFallback ?? false;

  // In-App Notification (immer, wenn gewuenscht, mit Constraint-Fallback)
  if (payload.channels.includes('in_app')) {
    const result = await safeInsertNotification(supabase, {
      user_id: payload.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      reference_id: payload.referenceId ?? null,
      reference_type: payload.referenceType ?? null,
      read: false,
    });
    results.in_app = result.success;
  }

  // Web Push
  let pushRequested = payload.channels.includes('push');
  if (pushRequested) {
    results.push = await sendPush(supabase, {
      userId: payload.userId,
      title: payload.title,
      body: payload.body,
      url: payload.url,
      tag: payload.type,
    });
  }

  // Fallback-Kaskade: Wenn Push fehlgeschlagen und Telefonnummer vorhanden,
  // automatisch SMS versuchen (auch wenn nicht explizit in channels)
  let smsRequested = payload.channels.includes('sms');
  const pushFailed = pushRequested && !results.push;
  if (enableFallback && pushFailed && payload.phone && !smsRequested) {
    console.warn(`[care/notify] Push fehlgeschlagen fuer User ${payload.userId}, Fallback auf SMS`);
    smsRequested = true;
  }

  // SMS (wenn Twilio konfiguriert + Telefonnummer vorhanden)
  if (smsRequested && payload.phone) {
    results.sms = await sendSms({
      phone: payload.phone,
      message: `${payload.title}: ${payload.body}`,
    });
  }

  // Fallback-Kaskade: Wenn SMS auch fehlgeschlagen, Voice versuchen
  let voiceRequested = payload.channels.includes('voice');
  const smsFailed = smsRequested && !results.sms;
  if (enableFallback && (pushFailed || smsFailed) && payload.phone && !voiceRequested) {
    console.warn(`[care/notify] Push/SMS fehlgeschlagen fuer User ${payload.userId}, Fallback auf Voice`);
    voiceRequested = true;
  }

  // Anruf (wenn Twilio konfiguriert + Telefonnummer vorhanden)
  if (voiceRequested && payload.phone) {
    results.voice = await initiateCall({
      phone: payload.phone,
      ttsMessage: `${payload.title}. ${payload.body}`,
    });
  }

  // Admin-Alert (spezielle In-App-Notification an alle Admins)
  if (payload.channels.includes('admin_alert')) {
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .eq('is_admin', true);

    if (admins) {
      for (const admin of admins) {
        await safeInsertNotification(supabase, {
          user_id: admin.id,
          type: 'care_escalation',
          title: `[ADMIN] ${payload.title}`,
          body: payload.body,
          reference_id: payload.referenceId ?? null,
          reference_type: payload.referenceType ?? null,
          read: false,
        });
      }
      results.admin_alert = true;
    }
  }

  // Pruefe ob mindestens ein Echtzeit-Kanal erfolgreich war
  const anyDelivered = results.push === true || results.sms === true || results.voice === true || results.admin_alert === true;

  return { ...results, anyDelivered };
}
