// app/api/care/stats/route.ts
// Nachbar.io — Aggregierte Pflege-Statistiken

import { requireAuth, requireAdmin, requireCareAccess, errorResponse, successResponse, careLog } from '@/lib/care/api-helpers';

/**
 * GET /api/care/stats
 * Aggregierte Statistiken für einen Senior oder systemweit (Admin).
 * Query: ?senior_id=... (optional, Admin bekommt ohne senior_id systemweite Daten)
 */
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth) return errorResponse('Nicht autorisiert', 401);

  const { supabase, user } = auth;
  const url = new URL(request.url);
  const seniorId = url.searchParams.get('senior_id');

  // Ohne senior_id: Admin-Check
  if (!seniorId) {
    const isAdmin = await requireAdmin(supabase, user.id);
    if (!isAdmin) return errorResponse('Senior-ID erforderlich oder Admin-Rechte', 403);
  } else if (seniorId !== user.id) {
    // Mit senior_id: Zugriffsprüfung
    const role = await requireCareAccess(supabase, seniorId);
    if (!role) return errorResponse('Kein Zugriff auf diesen Senior', 403);
  }

  careLog('stats', 'fetch', { seniorId: seniorId ?? 'system-wide', userId: user.id });

  try {
    // Build filter - seniorId scopes queries, null = system-wide
    const filter = seniorId;

    // Zeitstempel für 7-Tage-Abfragen
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    // Alle Abfragen parallel ausführen für Performance
    const [
      seniorsResult,
      sosResult,
      sosLast7Result,
      checkinsResult,
      checkinsLast7Result,
      medsResult,
      medsLogsResult,
      medsLast7Result,
      appointmentsResult,
      appointmentsUpcomingResult,
      helpersResult,
      helpersVerifiedResult,
      documentsResult,
      subscriptionsResult,
    ] = await Promise.all([
      // Senioren-Profile gesamt
      supabase.from('care_profiles').select('id', { count: 'exact', head: true }),

      // SOS-Alerts gesamt
      (() => {
        const q = supabase.from('care_sos_alerts').select('id, status', { count: 'exact', head: true });
        return filter ? q.eq('senior_id', filter) : q;
      })(),

      // SOS-Alerts letzte 7 Tage
      (() => {
        const q = supabase.from('care_sos_alerts').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo);
        return filter ? q.eq('senior_id', filter) : q;
      })(),

      // Check-ins gesamt
      (() => {
        const q = supabase.from('care_checkins').select('id, status', { count: 'exact', head: true });
        return filter ? q.eq('senior_id', filter) : q;
      })(),

      // Check-ins letzte 7 Tage
      (() => {
        const q = supabase.from('care_checkins').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo);
        return filter ? q.eq('senior_id', filter) : q;
      })(),

      // Aktive Medikamente
      (() => {
        const q = supabase.from('care_medications').select('id', { count: 'exact', head: true }).eq('active', true);
        return filter ? q.eq('senior_id', filter) : q;
      })(),

      // Medikamenten-Logs gesamt
      (() => {
        const q = supabase.from('care_medication_logs').select('id, status', { count: 'exact', head: true });
        return filter ? q.eq('senior_id', filter) : q;
      })(),

      // Medikamenten-Logs letzte 7 Tage
      (() => {
        const q = supabase.from('care_medication_logs').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo);
        return filter ? q.eq('senior_id', filter) : q;
      })(),

      // Termine gesamt
      (() => {
        const q = supabase.from('care_appointments').select('id', { count: 'exact', head: true });
        return filter ? q.eq('senior_id', filter) : q;
      })(),

      // Anstehende Termine
      (() => {
        const q = supabase.from('care_appointments').select('id', { count: 'exact', head: true }).gte('scheduled_at', now);
        return filter ? q.eq('senior_id', filter) : q;
      })(),

      // Helfer gesamt
      supabase.from('care_helpers').select('id', { count: 'exact', head: true }),

      // Verifizierte Helfer
      supabase.from('care_helpers').select('id', { count: 'exact', head: true }).eq('verification_status', 'verified'),

      // Dokumente
      (() => {
        const q = supabase.from('care_documents').select('id', { count: 'exact', head: true });
        return filter ? q.eq('senior_id', filter) : q;
      })(),

      // Abonnements (immer systemweit für Verteilung)
      supabase.from('care_subscriptions').select('plan'),
    ]);

    // Gelöste SOS-Rate berechnen
    let sosResolved = 0;
    const sosTotal = sosResult.count ?? 0;
    if (sosTotal > 0) {
      const resolvedQuery = supabase
        .from('care_sos_alerts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'resolved');
      const { count: resolvedCount } = filter
        ? await resolvedQuery.eq('senior_id', filter)
        : await resolvedQuery;
      sosResolved = resolvedCount ?? 0;
    }

    // Check-in Compliance berechnen
    let checkinOk = 0;
    const checkinTotal = checkinsResult.count ?? 0;
    if (checkinTotal > 0 && filter) {
      const { count: okCount } = await supabase
        .from('care_checkins')
        .select('id', { count: 'exact', head: true })
        .eq('senior_id', filter)
        .eq('status', 'ok');
      checkinOk = okCount ?? 0;
    }

    // Medikamenten-Compliance (genommen / gesamt)
    let medsTaken = 0;
    const medsLogTotal = medsLogsResult.count ?? 0;
    if (medsLogTotal > 0 && filter) {
      const { count: takenCount } = await supabase
        .from('care_medication_logs')
        .select('id', { count: 'exact', head: true })
        .eq('senior_id', filter)
        .eq('status', 'taken');
      medsTaken = takenCount ?? 0;
    }

    // Abo-Verteilung
    const subDistribution: Record<string, number> = { free: 0, basic: 0, family: 0, professional: 0, premium: 0 };
    if (subscriptionsResult.data) {
      for (const sub of subscriptionsResult.data) {
        if (sub.plan in subDistribution) {
          subDistribution[sub.plan]++;
        }
      }
    }

    const stats = {
      seniors: {
        total: seniorsResult.count ?? 0,
        active: seniorsResult.count ?? 0, // Alle Profile gelten vorerst als aktiv
      },
      sos: {
        total: sosTotal,
        resolved: sosResolved,
        avgResponseMinutes: null, // Komplexe Berechnung, später implementieren
        last7Days: sosLast7Result.count ?? 0,
      },
      checkins: {
        total: checkinTotal,
        complianceRate: checkinTotal > 0 ? Math.round((checkinOk / checkinTotal) * 100) : 0,
        last7Days: checkinsLast7Result.count ?? 0,
      },
      medications: {
        totalMeds: medsResult.count ?? 0,
        complianceRate: medsLogTotal > 0 ? Math.round((medsTaken / medsLogTotal) * 100) : 0,
        last7Days: medsLast7Result.count ?? 0,
      },
      appointments: {
        total: appointmentsResult.count ?? 0,
        upcoming: appointmentsUpcomingResult.count ?? 0,
      },
      helpers: {
        total: helpersResult.count ?? 0,
        verified: helpersVerifiedResult.count ?? 0,
      },
      documents: {
        total: documentsResult.count ?? 0,
      },
      subscriptions: subDistribution,
    };

    return successResponse(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return errorResponse(`Statistik-Fehler: ${message}`, 500);
  }
}
