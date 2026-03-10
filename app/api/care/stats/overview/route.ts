// app/api/care/stats/overview/route.ts
// Nachbar.io — Plattform-Uebersicht Statistiken (Admin)

import { requireAuth, requireAdmin, errorResponse, successResponse, careLog } from '@/lib/care/api-helpers';

/**
 * GET /api/care/stats/overview
 * Umfassende plattformweite Statistiken (nur Admin).
 * Fuer Investoren-Praesentationen und Pilot-Bewertung.
 */
export async function GET() {
  const auth = await requireAuth();
  if (!auth) return errorResponse('Nicht autorisiert', 401);

  const { supabase, user } = auth;
  const isAdmin = await requireAdmin(supabase, user.id);
  if (!isAdmin) return errorResponse('Nur fuer Administratoren', 403);

  careLog('stats', 'overview', { adminId: user.id });

  try {
    // Alle Abfragen parallel ausfuehren
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      totalUsersResult,
      activeSeniorsResult,
      helpersResult,
      verifiedHelpersResult,
      sosAllResult,
      sos30DResult,
      sosResolvedResult,
      checkinsAllResult,
      checkins30DResult,
      checkinOkResult,
      medsActiveResult,
      medLogsResult,
      medsTakenResult,
      appointmentsResult,
      appointmentsUpcomingResult,
      subscriptionsResult,
      documentsResult,
      auditResult,
      lastCronResult,
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('care_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('care_helpers').select('id', { count: 'exact', head: true }),
      supabase.from('care_helpers').select('id', { count: 'exact', head: true }).eq('verification_status', 'verified'),
      supabase.from('care_sos_alerts').select('id', { count: 'exact', head: true }),
      supabase.from('care_sos_alerts').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
      supabase.from('care_sos_alerts').select('id', { count: 'exact', head: true }).eq('status', 'resolved'),
      supabase.from('care_checkins').select('id', { count: 'exact', head: true }),
      supabase.from('care_checkins').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
      supabase.from('care_checkins').select('id', { count: 'exact', head: true }).eq('status', 'ok'),
      supabase.from('care_medications').select('id', { count: 'exact', head: true }).eq('active', true),
      supabase.from('care_medication_logs').select('id', { count: 'exact', head: true }),
      supabase.from('care_medication_logs').select('id', { count: 'exact', head: true }).eq('status', 'taken'),
      supabase.from('care_appointments').select('id', { count: 'exact', head: true }),
      supabase.from('care_appointments').select('id', { count: 'exact', head: true }).gte('scheduled_at', now.toISOString()),
      supabase.from('care_subscriptions').select('plan, status'),
      supabase.from('care_documents').select('id', { count: 'exact', head: true }),
      supabase.from('care_audit_log').select('id', { count: 'exact', head: true }),
      supabase.from('care_checkins').select('created_at').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    // Abo-Verteilung berechnen
    const distribution: Record<string, number> = { free: 0, basic: 0, family: 0, professional: 0, premium: 0 };
    let totalPaid = 0;
    let trialActive = 0;
    if (subscriptionsResult.data) {
      for (const sub of subscriptionsResult.data) {
        if (sub.plan in distribution) distribution[sub.plan]++;
        if (sub.plan !== 'free') totalPaid++;
        if (sub.status === 'trial') trialActive++;
      }
    }

    const totalSeniors = activeSeniorsResult.count ?? 0;
    const totalVerifiedHelpers = verifiedHelpersResult.count ?? 0;
    const totalCheckins = checkinsAllResult.count ?? 0;
    const okCheckins = checkinOkResult.count ?? 0;
    const totalSos = sosAllResult.count ?? 0;
    const resolvedSos = sosResolvedResult.count ?? 0;
    const totalMedLogs = medLogsResult.count ?? 0;
    const takenMeds = medsTakenResult.count ?? 0;

    const overview = {
      platform: {
        totalUsers: totalUsersResult.count ?? 0,
        activeSeniors: totalSeniors,
        registeredHelpers: helpersResult.count ?? 0,
        verifiedHelpers: totalVerifiedHelpers,
        helperCoverageRatio: totalSeniors > 0 ? Number((totalVerifiedHelpers / totalSeniors).toFixed(2)) : 0,
      },
      operations: {
        sosAlerts: {
          total: totalSos,
          last30Days: sos30DResult.count ?? 0,
          avgResponseMinutes: null, // Komplexe Berechnung, spaeter
          resolutionRate: totalSos > 0 ? Math.round((resolvedSos / totalSos) * 100) : 0,
        },
        checkins: {
          total: totalCheckins,
          last30Days: checkins30DResult.count ?? 0,
          complianceRate: totalCheckins > 0 ? Math.round((okCheckins / totalCheckins) * 100) : 0,
        },
        medications: {
          activePrescriptions: medsActiveResult.count ?? 0,
          complianceRate: totalMedLogs > 0 ? Math.round((takenMeds / totalMedLogs) * 100) : 0,
        },
        appointments: {
          total: appointmentsResult.count ?? 0,
          upcoming: appointmentsUpcomingResult.count ?? 0,
        },
      },
      subscriptions: {
        distribution,
        totalPaid,
        trialActive,
      },
      system: {
        documentsGenerated: documentsResult.count ?? 0,
        auditEntries: auditResult.count ?? 0,
        lastCronRun: lastCronResult.data?.created_at ?? null,
      },
      generatedAt: now.toISOString(),
    };

    return successResponse(overview);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return errorResponse(`Plattform-Statistik-Fehler: ${message}`, 500);
  }
}
