// lib/care/reports/generator.ts
// Nachbar.io — Server-seitiger Bericht-Daten-Generator

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CareDocumentType } from '../types';
import { AUDIT_EVENT_LABELS } from '../constants';
import type { CareAuditEventType } from '../types';
import type { ReportData, ReportMedicationEntry } from './types';

/**
 * Sammelt alle Pflege-Daten fuer einen Berichtszeitraum
 * und berechnet Zusammenfassungsstatistiken.
 */
export async function generateReportData(
  supabase: SupabaseClient,
  seniorId: string,
  periodStart: string,
  periodEnd: string,
  reportType: CareDocumentType
): Promise<ReportData> {
  const now = new Date().toISOString();

  // 1. Senior-Profil laden
  const [profileResult, userResult] = await Promise.all([
    supabase.from('care_profiles').select('care_level, created_at').eq('user_id', seniorId).maybeSingle(),
    supabase.from('users').select('display_name').eq('id', seniorId).single(),
  ]);

  const senior = {
    name: userResult.data?.display_name ?? 'Unbekannt',
    careLevel: profileResult.data?.care_level ?? 'none',
    profileCreatedAt: profileResult.data?.created_at ?? now,
  };

  // 2. Check-ins im Zeitraum
  const { data: checkins } = await supabase
    .from('care_checkins')
    .select('status')
    .eq('senior_id', seniorId)
    .gte('scheduled_at', periodStart)
    .lte('scheduled_at', periodEnd);

  const checkinList = checkins ?? [];
  const checkinOk = checkinList.filter(c => c.status === 'ok').length;
  const checkinNotWell = checkinList.filter(c => ['not_well', 'need_help'].includes(c.status)).length;
  const checkinMissed = checkinList.filter(c => c.status === 'missed').length;
  const checkinTotal = checkinList.length;
  const checkinCompliance = checkinTotal > 0 ? Math.round((checkinOk / checkinTotal) * 100) : 0;

  // 3. Medikamenten-Logs im Zeitraum
  const { data: medLogs } = await supabase
    .from('care_medication_logs')
    .select('medication_id, status')
    .eq('senior_id', seniorId)
    .gte('scheduled_at', periodStart)
    .lte('scheduled_at', periodEnd);

  const { data: medications } = await supabase
    .from('care_medications')
    .select('id, name, dosage')
    .eq('senior_id', seniorId);

  const medLogList = medLogs ?? [];
  const medList = medications ?? [];

  // Pro Medikament aggregieren
  const medEntries: ReportMedicationEntry[] = medList.map(med => {
    const logs = medLogList.filter(l => l.medication_id === med.id);
    const taken = logs.filter(l => l.status === 'taken').length;
    const skipped = logs.filter(l => l.status === 'skipped').length;
    const missed = logs.filter(l => l.status === 'missed').length;
    const total = logs.length;
    return {
      name: med.name,
      dosage: med.dosage,
      totalDoses: total,
      taken,
      skipped,
      missed,
      complianceRate: total > 0 ? Math.round((taken / total) * 100) : 0,
    };
  });

  const totalDoses = medLogList.length;
  const totalTaken = medLogList.filter(l => l.status === 'taken').length;
  const totalSkipped = medLogList.filter(l => l.status === 'skipped').length;
  const totalMissed = medLogList.filter(l => l.status === 'missed').length;

  // 4. SOS-Alerts im Zeitraum
  const { data: sosAlerts } = await supabase
    .from('care_sos_alerts')
    .select('status, category, created_at')
    .eq('senior_id', seniorId)
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd);

  const sosList = sosAlerts ?? [];
  const sosResolved = sosList.filter(s => s.status === 'resolved').length;
  const sosCancelled = sosList.filter(s => s.status === 'cancelled').length;
  const byCategory: Record<string, number> = {};
  for (const s of sosList) {
    byCategory[s.category] = (byCategory[s.category] ?? 0) + 1;
  }

  // 5. Termine im Zeitraum
  const { data: appointments } = await supabase
    .from('care_appointments')
    .select('scheduled_at')
    .eq('senior_id', seniorId)
    .gte('scheduled_at', periodStart)
    .lte('scheduled_at', periodEnd);

  const apptList = appointments ?? [];
  const pastAppts = apptList.filter(a => new Date(a.scheduled_at) < new Date(now)).length;

  // 6. Letzte Audit-Eintraege
  const { data: auditEntries } = await supabase
    .from('care_audit_log')
    .select('created_at, event_type, actor_id')
    .eq('senior_id', seniorId)
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd)
    .order('created_at', { ascending: false })
    .limit(50);

  // Actor-Namen laden
  const actorIds = [...new Set((auditEntries ?? []).map(e => e.actor_id))];
  const { data: actors } = actorIds.length > 0
    ? await supabase.from('users').select('id, display_name').in('id', actorIds)
    : { data: [] };
  const actorMap = new Map((actors ?? []).map(a => [a.id, a.display_name]));

  const recentActivity = (auditEntries ?? []).map(e => ({
    timestamp: e.created_at,
    eventType: e.event_type,
    eventLabel: AUDIT_EVENT_LABELS[e.event_type as CareAuditEventType] ?? e.event_type,
    actorName: actorMap.get(e.actor_id) ?? 'System',
  }));

  return {
    type: reportType,
    senior,
    periodStart,
    periodEnd,
    generatedAt: now,
    checkins: {
      total: checkinTotal,
      ok: checkinOk,
      notWell: checkinNotWell,
      missed: checkinMissed,
      complianceRate: checkinCompliance,
    },
    medications: {
      totalMedications: medList.length,
      totalDoses,
      taken: totalTaken,
      skipped: totalSkipped,
      missed: totalMissed,
      overallComplianceRate: totalDoses > 0 ? Math.round((totalTaken / totalDoses) * 100) : 0,
      medications: medEntries,
    },
    sos: {
      total: sosList.length,
      resolved: sosResolved,
      cancelled: sosCancelled,
      avgResponseMinutes: null, // Wird spaeter berechnet wenn Response-Daten vorhanden
      byCategory,
    },
    appointments: {
      total: apptList.length,
      upcoming: apptList.length - pastAppts,
      past: pastAppts,
    },
    recentActivity,
  };
}
