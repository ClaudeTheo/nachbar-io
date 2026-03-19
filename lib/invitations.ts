// lib/invitations.ts
// Personalisiertes Einladungssystem — SMS, WhatsApp, E-Mail, Code
// Erweitert das bestehende neighbor_invitations-System um SMS-Versand,
// Empfaengername, Plan-basiertes Rate-Limit und Conversion-Tracking.

import { SupabaseClient } from '@supabase/supabase-js';
import { sendSms, isTwilioConfigured } from '@/lib/care/channels/sms';

// Typen
export type InviteChannel = 'sms' | 'whatsapp' | 'email' | 'code';

export interface InviteRequest {
  recipientName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  channel: InviteChannel;
  street: string;
  houseNumber: string;
}

export interface InviteResult {
  success: boolean;
  inviteCode?: string;
  registerUrl?: string;
  whatsappUrl?: string;
  smsSent?: boolean;
  emailSent?: boolean;
  error?: string;
}

// Rate-Limits je Plan
const INVITE_LIMITS: Record<string, number> = {
  free: 5,
  plus: 50,
  pro_community: 200,
  pro_medical: 200,
};

const PILOT_MODE = process.env.NEXT_PUBLIC_PILOT_MODE === 'true';

/**
 * Prueft wie viele offene Einladungen ein Nutzer hat und ob das Limit erreicht ist.
 * PILOT_MODE: Free-Limit wird auf 50 angehoben.
 */
export async function checkInviteLimit(
  supabase: SupabaseClient,
  userId: string,
  userPlan: string
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const limit = PILOT_MODE
    ? Math.max(INVITE_LIMITS[userPlan] ?? 5, 50)
    : (INVITE_LIMITS[userPlan] ?? 5);

  const { count } = await supabase
    .from('neighbor_invitations')
    .select('id', { count: 'exact', head: true })
    .eq('inviter_id', userId)
    .in('status', ['sent', 'converted']);

  const used = count ?? 0;
  return {
    allowed: used < limit,
    remaining: Math.max(0, limit - used),
    limit,
  };
}

/**
 * Ermittelt den Plan eines Nutzers aus care_subscriptions.
 * Fallback: 'free'
 */
export async function getUserPlan(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data } = await supabase
    .from('care_subscriptions')
    .select('plan, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  return data?.plan ?? 'free';
}

/**
 * Erstellt eine personalisierte SMS-Nachricht.
 */
export function buildSmsMessage(inviterName: string, recipientName: string | undefined, registerUrl: string): string {
  const greeting = recipientName ? `Hallo ${recipientName}, ` : '';
  return `${greeting}${inviterName} lädt Sie in die QuartierApp ein – Ihre digitale Nachbarschafts-App. Registrieren Sie sich hier: ${registerUrl}`;
}

/**
 * Erstellt einen personalisierten WhatsApp-Text.
 */
export function buildWhatsAppMessage(inviterName: string, recipientName: string | undefined, registerUrl: string): string {
  const greeting = recipientName ? `Hallo ${recipientName}! ` : 'Hallo! ';
  return `${greeting}Ich bin ${inviterName} und nutze QuartierApp – unsere Quartiers-App für die Nachbarschaft. Möchten Sie auch dabei sein? Registrieren Sie sich hier: ${registerUrl}`;
}

/**
 * Erstellt die WhatsApp-URL (Deep-Link).
 * Wenn eine Telefonnummer vorhanden ist, wird sie als Empfaenger gesetzt.
 */
export function buildWhatsAppUrl(message: string, phone?: string): string {
  if (phone) {
    // Nummer normalisieren: nur Ziffern + fuehrendes +
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Validiert eine Telefonnummer (E.164-Format oder deutsche Formate).
 */
export function validatePhone(phone: string): { valid: boolean; normalized: string } {
  // Leerzeichen, Klammern, Bindestriche entfernen
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Deutsche Nummer ohne Laendervorwahl -> +49
  if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
    cleaned = '+49' + cleaned.slice(1);
  }
  // 00-Prefix -> +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }
  // Sicherstellen dass + am Anfang steht
  if (!cleaned.startsWith('+')) {
    cleaned = '+49' + cleaned;
  }

  // E.164 Validierung: + gefolgt von 7-15 Ziffern
  const isValid = /^\+[1-9]\d{6,14}$/.test(cleaned);
  return { valid: isValid, normalized: cleaned };
}

/**
 * Sendet eine SMS-Einladung via Twilio.
 */
export async function sendInviteSms(
  phone: string,
  inviterName: string,
  recipientName: string | undefined,
  registerUrl: string
): Promise<{ sent: boolean; error?: string }> {
  if (!isTwilioConfigured()) {
    return { sent: false, error: 'SMS-Service nicht konfiguriert' };
  }

  const { valid, normalized } = validatePhone(phone);
  if (!valid) {
    return { sent: false, error: 'Ungültige Telefonnummer' };
  }

  const message = buildSmsMessage(inviterName, recipientName, registerUrl);
  const sent = await sendSms({ phone: normalized, message });

  return { sent };
}

/**
 * Markiert eine Einladung als konvertiert wenn ein neuer Nutzer sich registriert.
 * Wird von der Registrierungs-Route aufgerufen.
 */
export async function trackInviteConversion(
  supabase: SupabaseClient,
  inviteCode: string,
  newUserId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('neighbor_invitations')
    .update({
      status: 'converted',
      converted_user_id: newUserId,
      converted_at: new Date().toISOString(),
    })
    .eq('invite_code', inviteCode)
    .eq('status', 'sent');

  if (error) {
    console.error('[invitations] Conversion-Tracking fehlgeschlagen:', error.message);
    return false;
  }
  return true;
}

/**
 * Laedt die Einladungsstatistiken eines Nutzers.
 */
export async function getInviteStats(
  supabase: SupabaseClient,
  userId: string
): Promise<{ total: number; pending: number; converted: number; expired: number }> {
  const { data } = await supabase
    .from('neighbor_invitations')
    .select('status')
    .eq('inviter_id', userId);

  if (!data) return { total: 0, pending: 0, converted: 0, expired: 0 };

  return {
    total: data.length,
    pending: data.filter(i => i.status === 'sent').length,
    converted: data.filter(i => i.status === 'converted' || i.status === 'accepted').length,
    expired: data.filter(i => i.status === 'expired').length,
  };
}
