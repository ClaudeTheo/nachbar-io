// lib/care/notifications.ts
// Multi-Channel Benachrichtigungs-Service fuer das Care-Modul

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CareNotificationType } from './types';
import { sendPush } from './channels/push';
import { sendSms } from './channels/sms';
import { initiateCall } from './channels/voice';
import { safeInsertNotification } from '@/lib/notifications-server';

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
}

/**
 * Sendet eine Benachrichtigung ueber alle angegebenen Kanaele.
 * Schreibt immer eine In-App-Notification, wenn 'in_app' in channels ist.
 */
export async function sendCareNotification(
  supabase: SupabaseClient,
  payload: CareNotificationPayload
): Promise<void> {
  const results: Record<string, boolean> = {};

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
  if (payload.channels.includes('push')) {
    results.push = await sendPush(supabase, {
      userId: payload.userId,
      title: payload.title,
      body: payload.body,
      url: payload.url,
      tag: payload.type,
    });
  }

  // SMS (wenn Twilio konfiguriert + Telefonnummer vorhanden)
  if (payload.channels.includes('sms') && payload.phone) {
    results.sms = await sendSms({
      phone: payload.phone,
      message: `${payload.title}: ${payload.body}`,
    });
  }

  // Anruf (wenn Twilio konfiguriert + Telefonnummer vorhanden)
  if (payload.channels.includes('voice') && payload.phone) {
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
    }
  }
}
