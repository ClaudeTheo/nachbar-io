// lib/analytics.ts
// Nachbar.io — Analytics-Bibliothek: KPI-Berechnung pro Quartier
// Laeuft serverseitig im Cron-Job (service_role Client)

import { SupabaseClient } from '@supabase/supabase-js';

// Typ fuer einen Analytics-Snapshot
export interface AnalyticsSnapshot {
  quarter_id: string;
  snapshot_date: string; // YYYY-MM-DD
  // North Star
  wah: number;
  // Consumer
  total_users: number;
  active_users_7d: number;
  active_users_30d: number;
  new_registrations: number;
  activation_rate: number;
  retention_7d: number;
  retention_30d: number;
  invite_sent: number;
  invite_converted: number;
  invite_conversion_rate: number;
  posts_count: number;
  events_count: number;
  rsvp_count: number;
  // Angehoerige
  plus_subscribers: number;
  heartbeat_coverage: number;
  checkin_frequency: number;
  escalation_count: number;
  // B2B
  active_orgs: number;
  // Revenue
  mrr: number;
}

// Hilfsfunktion: Datum im ISO-Format (YYYY-MM-DD)
function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Hilfsfunktion: Datum X Tage in der Vergangenheit als ISO-String
function daysAgo(days: number, now: Date = new Date()): string {
  const d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

/**
 * Berechnet alle KPI-Metriken fuer ein Quartier.
 * Nutzt den service_role Client (kein User-Kontext, bypassed RLS).
 */
export async function calculateQuarterSnapshot(
  supabase: SupabaseClient,
  quarterId: string,
  now: Date = new Date()
): Promise<AnalyticsSnapshot> {
  const today = toDateString(now);
  const sevenDaysAgo = daysAgo(7, now);
  const thirtyDaysAgo = daysAgo(30, now);
  const oneDayAgo = daysAgo(1, now);

  // --- Nutzer-Metriken ---
  // Alle Nutzer im Quartier (ueber household_members → households)
  const { count: totalUsers } = await supabase
    .from('household_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('household_id.quarter_id' as never, quarterId);

  // Fallback: Nutzer direkt ueber Households zaehlen
  const { data: quarterHouseholds } = await supabase
    .from('households')
    .select('id')
    .eq('quarter_id', quarterId);

  const householdIds = quarterHouseholds?.map((h) => h.id) ?? [];

  // Alle Nutzer im Quartier
  let totalUserCount = 0;
  if (householdIds.length > 0) {
    const { count } = await supabase
      .from('household_members')
      .select('user_id', { count: 'exact', head: true })
      .in('household_id', householdIds);
    totalUserCount = count ?? 0;
  }

  // Aktive Nutzer (7 Tage) — basierend auf last_seen in users-Tabelle
  let activeUsers7d = 0;
  if (householdIds.length > 0) {
    const { data: activeMembers7d } = await supabase
      .from('household_members')
      .select('user_id')
      .in('household_id', householdIds);

    if (activeMembers7d && activeMembers7d.length > 0) {
      const userIds = activeMembers7d.map((m) => m.user_id);
      const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .in('id', userIds)
        .gte('last_seen', sevenDaysAgo);
      activeUsers7d = count ?? 0;
    }
  }

  // Aktive Nutzer (30 Tage)
  let activeUsers30d = 0;
  if (householdIds.length > 0) {
    const { data: activeMembers30d } = await supabase
      .from('household_members')
      .select('user_id')
      .in('household_id', householdIds);

    if (activeMembers30d && activeMembers30d.length > 0) {
      const userIds = activeMembers30d.map((m) => m.user_id);
      const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .in('id', userIds)
        .gte('last_seen', thirtyDaysAgo);
      activeUsers30d = count ?? 0;
    }
  }

  // --- WAH (Weekly Active Households) ---
  // Distinkte Households mit mindestens einem aktiven Nutzer in den letzten 7 Tagen
  let wah = 0;
  if (householdIds.length > 0) {
    const { data: activeMembers } = await supabase
      .from('household_members')
      .select('household_id, user_id')
      .in('household_id', householdIds);

    if (activeMembers && activeMembers.length > 0) {
      const userIds = activeMembers.map((m) => m.user_id);
      const { data: activeUsers } = await supabase
        .from('users')
        .select('id')
        .in('id', userIds)
        .gte('last_seen', sevenDaysAgo);

      if (activeUsers) {
        const activeUserIds = new Set(activeUsers.map((u) => u.id));
        const activeHouseholdIds = new Set(
          activeMembers
            .filter((m) => activeUserIds.has(m.user_id))
            .map((m) => m.household_id)
        );
        wah = activeHouseholdIds.size;
      }
    }
  }

  // --- Content-Metriken ---
  // Beitraege (help_requests mit category='board' = Schwarzes Brett) in den letzten 7 Tagen
  const { count: postsCount } = await supabase
    .from('help_requests')
    .select('id', { count: 'exact', head: true })
    .eq('quarter_id', quarterId)
    .eq('category', 'board')
    .gte('created_at', sevenDaysAgo);

  // Events in den letzten 7 Tagen
  const { count: eventsCount } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('quarter_id', quarterId)
    .gte('created_at', sevenDaysAgo);

  // RSVPs (event_participants) in den letzten 7 Tagen
  const { count: rsvpCount } = await supabase
    .from('event_participants')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo);

  // --- Heartbeat-Coverage ---
  // Anteil der Nutzer mit mindestens einem Heartbeat in den letzten 24 Stunden
  let heartbeatCoverage = 0;
  if (totalUserCount > 0 && householdIds.length > 0) {
    const { data: allMembers } = await supabase
      .from('household_members')
      .select('user_id')
      .in('household_id', householdIds);

    if (allMembers && allMembers.length > 0) {
      const userIds = allMembers.map((m) => m.user_id);
      // Heartbeats der letzten 24h zaehlen (distinkt nach user_id)
      const { data: recentHeartbeats } = await supabase
        .from('heartbeats')
        .select('user_id')
        .in('user_id', userIds)
        .gte('created_at', oneDayAgo);

      if (recentHeartbeats) {
        const uniqueHeartbeatUsers = new Set(recentHeartbeats.map((h) => h.user_id));
        heartbeatCoverage = Number(
          ((uniqueHeartbeatUsers.size / totalUserCount) * 100).toFixed(2)
        );
      }
    }
  }

  // --- Eskalationen (letzte 7 Tage) ---
  const { count: escalationCount } = await supabase
    .from('escalation_events')
    .select('id', { count: 'exact', head: true })
    .gte('triggered_at', sevenDaysAgo);

  // --- Plus-Abonnenten ---
  const { count: plusSubscribers } = await supabase
    .from('care_subscriptions')
    .select('id', { count: 'exact', head: true })
    .in('plan', ['basic', 'family', 'professional', 'premium'])
    .eq('status', 'active');

  // --- Organisationen (aktiv, verifiziert) ---
  const { count: activeOrgs } = await supabase
    .from('organizations')
    .select('id', { count: 'exact', head: true })
    .eq('verification_status', 'verified');

  return {
    quarter_id: quarterId,
    snapshot_date: today,
    wah,
    total_users: totalUserCount,
    active_users_7d: activeUsers7d,
    active_users_30d: activeUsers30d,
    new_registrations: 0, // Spaeter: Neue Registrierungen heute
    activation_rate: 0, // Spaeter: Anteil aktivierter Nutzer
    retention_7d: totalUserCount > 0
      ? Number(((activeUsers7d / totalUserCount) * 100).toFixed(2))
      : 0,
    retention_30d: totalUserCount > 0
      ? Number(((activeUsers30d / totalUserCount) * 100).toFixed(2))
      : 0,
    invite_sent: 0, // Spaeter: Einladungen heute
    invite_converted: 0, // Spaeter: Konvertierte Einladungen
    invite_conversion_rate: 0,
    posts_count: postsCount ?? 0,
    events_count: eventsCount ?? 0,
    rsvp_count: rsvpCount ?? 0,
    plus_subscribers: plusSubscribers ?? 0,
    heartbeat_coverage: heartbeatCoverage,
    checkin_frequency: 0, // Spaeter: Durchschnittliche Check-in-Frequenz
    escalation_count: escalationCount ?? 0,
    active_orgs: activeOrgs ?? 0,
    mrr: 0, // Spaeter: MRR aus Stripe
  };
}

/**
 * Speichert einen Snapshot (Upsert: Insert oder Update bei gleichem Quartier + Datum).
 * Nutzt den service_role Client (bypassed RLS).
 */
export async function saveSnapshot(
  supabase: SupabaseClient,
  snapshot: AnalyticsSnapshot
): Promise<void> {
  const { error } = await supabase
    .from('analytics_snapshots')
    .upsert(snapshot, {
      onConflict: 'quarter_id,snapshot_date',
    });

  if (error) {
    console.error('[analytics] Snapshot speichern fehlgeschlagen:', error);
    throw new Error(`Analytics-Snapshot konnte nicht gespeichert werden: ${error.message}`);
  }
}
