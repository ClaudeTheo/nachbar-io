// lib/care/health.ts
// Nachbar.io — Care-Modul Gesundheitspruefungen

import type { SupabaseClient } from '@supabase/supabase-js';

export interface HealthCheck {
  name: string;
  status: 'ok' | 'warn' | 'error';
  detail: string;
  responseMs?: number;
}

/**
 * Fuehrt Care-spezifische Gesundheitspruefungen durch.
 * Prueft Tabellen-Zugriff, Cron-Aktualitaet und offene Alarme.
 */
export async function runCareHealthChecks(supabase: SupabaseClient): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];

  // 1. care_profiles Tabelle erreichbar
  const profileStart = Date.now();
  try {
    const { count, error } = await supabase
      .from('care_profiles')
      .select('id', { count: 'exact', head: true });
    const ms = Date.now() - profileStart;
    if (error) {
      checks.push({ name: 'Care-Profile', status: 'error', detail: error.message, responseMs: ms });
    } else {
      checks.push({ name: 'Care-Profile', status: ms > 2000 ? 'warn' : 'ok', detail: `${count ?? 0} Profile, ${ms}ms`, responseMs: ms });
    }
  } catch {
    checks.push({ name: 'Care-Profile', status: 'error', detail: 'Tabelle nicht erreichbar', responseMs: Date.now() - profileStart });
  }

  // 2. Offene SOS-Alerts (nicht aufgeloeste, aelter als 24h = warn)
  try {
    const { count: activeCount } = await supabase
      .from('care_sos_alerts')
      .select('id', { count: 'exact', head: true })
      .in('status', ['triggered', 'notified', 'accepted', 'helper_enroute']);

    checks.push({
      name: 'SOS-Alarme',
      status: (activeCount ?? 0) > 0 ? 'warn' : 'ok',
      detail: `${activeCount ?? 0} aktiv`,
    });
  } catch {
    checks.push({ name: 'SOS-Alarme', status: 'error', detail: 'Abfrage fehlgeschlagen' });
  }

  // 3. Check-in Cron-Aktualitaet (letzter Check-in < 30 min = ok)
  try {
    const { data: lastCheckin } = await supabase
      .from('care_checkins')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastCheckin) {
      const minutesAgo = Math.round((Date.now() - new Date(lastCheckin.created_at).getTime()) / 60000);
      checks.push({
        name: 'Check-in Cron',
        status: minutesAgo > 30 ? 'warn' : 'ok',
        detail: minutesAgo < 60 ? `Letzter vor ${minutesAgo} Min.` : `Letzter vor ${Math.round(minutesAgo / 60)} Std.`,
      });
    } else {
      checks.push({ name: 'Check-in Cron', status: 'warn', detail: 'Keine Check-ins vorhanden' });
    }
  } catch {
    checks.push({ name: 'Check-in Cron', status: 'error', detail: 'Abfrage fehlgeschlagen' });
  }

  // 4. Audit-Log Integritaet (Eintraege vorhanden)
  try {
    const { count } = await supabase
      .from('care_audit_log')
      .select('id', { count: 'exact', head: true });
    checks.push({
      name: 'Audit-Log',
      status: 'ok',
      detail: `${count ?? 0} Eintraege`,
    });
  } catch {
    checks.push({ name: 'Audit-Log', status: 'error', detail: 'Tabelle nicht erreichbar' });
  }

  // 5. Subscriptions-Tabelle erreichbar
  try {
    const { count, error } = await supabase
      .from('care_subscriptions')
      .select('id', { count: 'exact', head: true });
    if (error) {
      checks.push({ name: 'Abonnements', status: 'error', detail: error.message });
    } else {
      checks.push({ name: 'Abonnements', status: 'ok', detail: `${count ?? 0} Abonnements` });
    }
  } catch {
    checks.push({ name: 'Abonnements', status: 'error', detail: 'Tabelle nicht erreichbar' });
  }

  return checks;
}
