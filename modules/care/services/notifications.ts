// lib/care/notifications.ts
// Multi-Channel Benachrichtigungs-Service fuer das Care-Modul
// Mit Fallback-Kaskade: Push -> SMS -> Voice

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CaregiverRelationshipType,
  CareHelperRole,
  CareNotificationType,
} from './types';
import { sendPush } from './channels/push';
import { sendSms } from './channels/sms';
import { initiateCall } from './channels/voice';
import { safeInsertNotification } from '@/lib/notifications-server';
import { mapCaregiverRelationshipToRole } from './permissions';

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

export interface CareNotificationRecipient {
  userId: string;
  role: CareHelperRole;
  source: 'care_helpers' | 'caregiver_links';
}

interface CareNotificationRecipientsInput {
  seniorId: string;
  roles: CareHelperRole[];
}

const EXTERNAL_CARE_NOTIFICATION_MESSAGE =
  'QuartierApp: Es gibt eine neue Care-Benachrichtigung. Bitte oeffnen Sie die App oder melden Sie sich ueber den bekannten direkten Kontakt. Bei akuter Gefahr zuerst 112/110.';

export async function getCareNotificationRecipients(
  supabase: SupabaseClient,
  input: CareNotificationRecipientsInput,
): Promise<CareNotificationRecipient[]> {
  const recipients = new Map<string, CareNotificationRecipient>();

  const { data: legacyHelpers } = await supabase
    .from('care_helpers')
    .select('user_id, role')
    .in('role', input.roles)
    .eq('verification_status', 'verified')
    .contains('assigned_seniors', [input.seniorId]);

  for (const helper of legacyHelpers ?? []) {
    if (typeof helper.user_id !== 'string') continue;
    recipients.set(helper.user_id, {
      userId: helper.user_id,
      role: helper.role as CareHelperRole,
      source: 'care_helpers',
    });
  }

  const { data: caregiverLinks } = await supabase
    .from('caregiver_links')
    .select('caregiver_id, relationship_type')
    .eq('resident_id', input.seniorId)
    .is('revoked_at', null);

  for (const link of caregiverLinks ?? []) {
    if (typeof link.caregiver_id !== 'string') continue;
    if (recipients.has(link.caregiver_id)) continue;

    const role = mapCaregiverRelationshipToRole(
      link.relationship_type as CaregiverRelationshipType,
    );
    if (!input.roles.includes(role)) continue;

    recipients.set(link.caregiver_id, {
      userId: link.caregiver_id,
      role,
      source: 'caregiver_links',
    });
  }

  return [...recipients.values()];
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
  const pushRequested = payload.channels.includes('push');
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
      message: EXTERNAL_CARE_NOTIFICATION_MESSAGE,
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
      ttsMessage: EXTERNAL_CARE_NOTIFICATION_MESSAGE,
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
