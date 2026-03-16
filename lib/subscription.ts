// lib/subscription.ts
// Nachbar.io — Trial-Ablauf und Auto-Downgrade Logik
// Prueft care_subscriptions auf ablaufende Trials und stuft auf Free herunter

import type { SupabaseClient } from '@supabase/supabase-js';

// Trial-Dauer: 14 Tage
export const TRIAL_DURATION_DAYS = 14;

// Warnung 3 Tage vor Ablauf
export const WARNING_DAYS_BEFORE = 3;

export interface TrialExpiryResult {
  expired: string[];
  warned: string[];
}

/**
 * Prueft alle Nutzer mit Trial-Status:
 * - expired: trial_ends_at liegt in der Vergangenheit → Downgrade
 * - warned: trial_ends_at liegt innerhalb der naechsten WARNING_DAYS_BEFORE Tage → Warnung
 */
export async function checkTrialExpiry(
  supabase: SupabaseClient
): Promise<TrialExpiryResult> {
  const now = new Date();
  const warningDate = new Date(now.getTime() + WARNING_DAYS_BEFORE * 24 * 60 * 60 * 1000);

  // Abgelaufene Trials: trial_ends_at < jetzt, Status noch 'trial'
  const { data: expiredRows, error: expiredError } = await supabase
    .from('care_subscriptions')
    .select('user_id')
    .eq('status', 'trial')
    .lt('trial_ends_at', now.toISOString());

  if (expiredError) {
    console.error('[subscription] Fehler beim Laden abgelaufener Trials:', expiredError);
    throw expiredError;
  }

  // Bald ablaufende Trials: trial_ends_at zwischen jetzt und jetzt + 3 Tage
  const { data: warningRows, error: warningError } = await supabase
    .from('care_subscriptions')
    .select('user_id')
    .eq('status', 'trial')
    .gte('trial_ends_at', now.toISOString())
    .lte('trial_ends_at', warningDate.toISOString());

  if (warningError) {
    console.error('[subscription] Fehler beim Laden bald ablaufender Trials:', warningError);
    throw warningError;
  }

  return {
    expired: (expiredRows ?? []).map((r: { user_id: string }) => r.user_id),
    warned: (warningRows ?? []).map((r: { user_id: string }) => r.user_id),
  };
}

/**
 * Stuft einen Nutzer auf Free herunter:
 * - Setzt users.role auf 'user'
 * - Setzt care_subscriptions.status auf 'expired', plan auf 'free'
 * - Behaelt caregiver_links, aber setzt heartbeat_visible auf false
 * Nutzer kann jederzeit erneut abonnieren.
 */
export async function downgradeToFree(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  // 1) Nutzer-Rolle auf 'user' zuruecksetzen
  const { error: userError } = await supabase
    .from('users')
    .update({ role: 'user' })
    .eq('id', userId);

  if (userError) {
    console.error(`[subscription] Fehler beim Downgrade von users fuer ${userId}:`, userError);
    throw userError;
  }

  // 2) Subscription auf expired/free setzen
  const { error: subError } = await supabase
    .from('care_subscriptions')
    .update({
      status: 'expired',
      plan: 'free',
    })
    .eq('user_id', userId);

  if (subError) {
    console.error(`[subscription] Fehler beim Downgrade von care_subscriptions fuer ${userId}:`, subError);
    throw subError;
  }

  // 3) Caregiver-Links behalten, aber heartbeat_visible deaktivieren
  // Damit sieht der Angehoerige keinen Heartbeat-Status mehr, kann aber spaeter reaktivieren
  const { error: linkError } = await supabase
    .from('caregiver_links')
    .update({ heartbeat_visible: false })
    .eq('resident_id', userId)
    .is('revoked_at', null);

  if (linkError) {
    console.error(`[subscription] Fehler beim Deaktivieren der Caregiver-Heartbeats fuer ${userId}:`, linkError);
    // Nicht werfen — Downgrade war erfolgreich, Heartbeat-Visibility ist sekundaer
  }
}
